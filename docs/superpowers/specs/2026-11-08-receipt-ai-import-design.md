# 小票拍照与 AI 自动分类设计

## 目标

在现有“我的厨房”PWA 中加入购物小票拍照/相册上传能力。小票由火山方舟豆包多模态模型识别，用户在确认页修改结果后，才批量写入手机本地 IndexedDB 库存。

## 已确认范围

- 前端继续部署在 GitHub Pages：`https://xiaoqi33937497-alt.github.io/my-kitchen/`。
- 不增加登录，不把库存同步到云端。
- AI 提供方使用火山方舟，模型使用 `doubao-seed-2-1-lite-260915`。
- 火山引擎 veFaaS Web 应用函数持有 API Key，浏览器和 GitHub 仓库不得包含密钥。
- 第一版只处理一张购物小票图片；不处理 PDF、多张拼接图或菜谱视频。
- AI 结果不得直接入库，必须经过用户确认。

## 用户流程

1. 首页“上传购物小票”按钮进入 `/receipts/new`。
2. 用户拍照或从相册选择一张 JPEG/PNG/WebP 图片。
3. 浏览器校验格式和大小，按需缩放并压缩；展示预览。
4. 用户点击“开始识别”，前端以 JSON + Base64 调用 veFaaS HTTPS 接口。
5. 云函数校验 Origin、请求体和图片大小，再调用火山方舟 Responses API。
6. 云函数把模型输出解析成固定结构并返回；解析失败返回可理解的错误，不返回密钥或上游原始调试信息。
7. 前端显示可编辑确认清单。购买日期作为整张小票的字段编辑；每个商品可改名称、分类、存放位置、数量、单位、包装到期日，也可删除误识别行。
8. 用户点击“全部加入库存”，通过新增的 `InventoryService.createItems` 在同一事务内逐项复用现有保质期计算并写入 IndexedDB。
9. 保存成功后回到库存页；批量保存任一项失败时整批回滚并保留确认清单，供用户修正后重试。

## 数据契约

### 请求

`POST /v1/receipts/analyze`

```ts
interface AnalyzeReceiptRequest {
  image: {
    mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
    base64: string;
  };
  clientDate: string; // YYYY-MM-DD, Asia/Shanghai
}
```

### 响应

```ts
interface ReceiptDraft {
  receiptDate: string | null;
  merchantName: string | null;
  items: ReceiptApiItem[];
  warnings: string[];
}

interface ReceiptApiItem {
  name: string;
  category: InventoryCategory;
  storageZone: StorageZone;
  quantity: number;
  unit: string;
  packageExpiryDate?: string;
  confidence: 'high' | 'medium' | 'low';
}
```

服务端响应中的 `items` 为 `ReceiptApiItem[]`，不含 ID。前端进入确认状态后转换为带临时 `draftId` 的 `EditableReceiptItem`；最终转换成 `NewInventoryItem` 时才生成正式库存 `id`。

允许分类仅为 `vegetable | fruit | protein | drink | snack | staple | other`，存放位置仅为 `fridge | freezer | pantry`。服务端对模型 JSON 再做白名单校验；非法枚举降级为 `other`/`pantry`，数量无效时降级为 `1`，并追加 warning。购买日期优先使用小票日期，无法识别时使用 `clientDate`。

## 前端设计

- 新增独立 receipt feature，避免把上传状态塞进 Dashboard。
- 图片处理模块只在内存中工作，不把小票图片写入 IndexedDB、Cache Storage 或日志。
- 客户端和服务端都校验 JPEG/PNG/WebP magic bytes，不能只信任 MIME；最大 36,000,000 像素、单边不超过 10,000 px、长宽比不超过 20:1，并正确处理 EXIF 方向。
- 默认限制源文件 10 MB；先把最长边缩至 2200 px，再从 JPEG 质量 0.82 开始有限次降质/降尺寸，压缩后二进制不得超过 4 MiB。
- 上传状态明确区分：待选图、压缩中、识别中、确认、保存中、失败。
- 确认页字段使用现有库存枚举和中文文案，移动端按钮最小点击高度 44 px。
- 批量保存使用新增 `createItems` 服务方法；事务保证要么全部保存成功，要么全部不写入，防止半批数据。

## 云函数设计

- 代码位于 `server/receipt-reader/`，可独立测试和打包为 veFaaS Web 应用函数。
- 使用 Node.js 原生 HTTP server，监听 `0.0.0.0:8000`；不用数据库，不保存图片。
- 环境变量：
  - `ARK_API_KEY`：用户在方舟创建的密钥，仅配置在 veFaaS。
  - `ARK_MODEL_ID=doubao-seed-2-1-lite-260915`。
  - `ALLOWED_ORIGIN=https://xiaoqi33937497-alt.github.io`。
- 接受 `OPTIONS` 和 `POST`；其他方法返回 405。
- HTTP 请求体流式累计，超过 6 MiB 立即终止；Base64 解码后再次执行 4 MiB 二进制上限和 magic bytes 校验。
- CORS 只向 `ALLOWED_ORIGIN` 回显，API 网关自动 CORS 必须关闭，避免产生 `*` 或重复响应头。
- Origin 校验不是身份认证。由于产品明确不登录，API 网关必须配置按源 IP 限流、低最大并发、全局每日硬配额；方舟请求关闭深度思考、限制输出 token 和最多 80 个商品。若平台无法提供可验证的每日硬配额或自动熔断，本功能不得公开发布。
- 调用方舟时要求结构化 JSON 输出；服务端仍需提取、解析和规范化，不能信任模型完全遵守格式。
- 错误映射：请求错误 400/413/415，来源不允许 403，上游限流 429，上游或解析失败 502，超时 504；响应不暴露 API Key、完整 Base64、上游响应头或堆栈。
- 日志只记录 request id、耗时、状态码和项目数，不记录小票内容或模型原文。

## 安全、隐私与费用

- API Key 不进入 `.env` 提交、前端构建产物、测试快照或聊天截图。
- GitHub Pages 只能保存公开配置 `VITE_RECEIPT_API_URL`。
- 发布前检查构建产物不存在 `ARK_API_KEY` 或实际密钥片段。
- API 网关设置请求体上限、每分钟低额度限流及每日配额；火山引擎费用中心设置预算告警。
- 关闭 API 网关/APM 的请求与响应正文采样，核查方舟账号的数据留存配置，并设置最短可用日志保留期。
- 浏览器端不永久保存小票原图；用户离开流程即释放预览 URL。
- 火山方舟隐私和留存以用户账号实际协议与控制台配置为准，界面不做超出官方条款的绝对承诺。
- 上传页明确提示“小票图片将发送至火山方舟识别”，提醒小票可能包含会员号、门店和支付尾号等信息。

## 失败与恢复

- 网络断开、模型超时、额度不足：保留本地预览并允许重试。
- 小票模糊或不是小票：返回 warning 和可能为空的 items；不自动创建库存。
- 重复提交：第一版不做云端幂等，因为云端不保存状态；确认页在成功保存后立即禁用再次保存并导航离开。
- 刷新确认页会丢失尚未保存的草稿，这是第一版可接受限制；已入库数据不受影响。

## 验收标准

- iPhone Safari 可拍照或选图并看到预览。
- 清晰中文小票可得到可编辑商品清单。
- 鸡蛋等商品能映射到正确分类/存储建议，并在最终库存显示现有 emoji 规则。
- 未确认前 IndexedDB 不新增任何库存。
- 批量保存具有事务性，成功后首页与库存统计刷新。
- 非允许 Origin、超大图片、错误格式、畸形模型输出均有确定错误行为。
- 已验证按 IP 限流、全局每日硬配额/自动熔断、最大并发和费用预警；缺少任一硬性费用保护时不发布公网入口。
- 仓库和前端产物不包含方舟 API Key。

## 暂不实现

- 账号登录、跨设备同步、云端保存小票。
- 精确到品牌 SKU 的保质期数据库。
- 自动扣款、自动购买或无需确认直接入库。
- 多张小票合并、PDF、菜谱视频分析。
