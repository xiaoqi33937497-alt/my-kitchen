import type { AnalyzeReceiptRequest } from './contracts.js';

export interface ArkDeps {
  apiKey: string;
  modelId: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export async function callArk(input: AnalyzeReceiptRequest, deps: ArkDeps): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deps.timeoutMs ?? 25_000);
  const fetchImpl = deps.fetchImpl ?? fetch;
  try {
    const response = await fetchImpl('https://ark.cn-beijing.volces.com/api/v3/responses', {
      method: 'POST',
      signal: controller.signal,
      headers: { authorization: `Bearer ${deps.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: deps.modelId,
        thinking: { type: 'disabled' },
        max_output_tokens: 2200,
        input: [{ role: 'user', content: [
          { type: 'input_image', image_url: `data:${input.image.mimeType};base64,${input.image.base64}` },
          { type: 'input_text', text: input.mode === 'nutrition-label'
            ? '识别营养成分表并换算为每100克。仅返回 JSON：{"per100g":{"caloriesKcal":0,"proteinGrams":0,"fatGrams":0,"carbohydrateGrams":0,"sodiumMilligrams":0},"warnings":[]}。若能量为千焦，除以4.184得到千卡；若标签按份且无法确认每份克数，不要猜测，返回 warnings 并令数值为0。不要Markdown。'
            : '识别购物小票中的食品、称重重量、商品金额和实付总额，不保存优惠。仅返回 JSON：{"receiptDate":"YYYY-MM-DD或null","merchantName":"字符串或null","totalPaidCents":整数分,"items":[{"name":"商品名","category":"vegetable|fruit|protein|dairy|dessert|drink|snack|staple|other","storageZone":"fridge|freezer|pantry","quantity":1,"unit":"件","weightGrams":实际克数可省略,"lineAmountCents":整数分可省略,"nutritionPer100g":{"caloriesKcal":0,"proteinGrams":0,"fatGrams":0,"carbohydrateGrams":0,"sodiumMilligrams":0}称重生鲜可按名称参考估算否则省略,"packageExpiryDate":"YYYY-MM-DD可省略","confidence":"high|medium|low"}],"warnings":[]}。乳制品使用 dairy，甜品使用 dessert。最多80项，不要Markdown。' },
        ] }],
      }),
    });
    if (!response.ok) {
      const status = response.status === 429 ? 429 : 502;
      throw Object.assign(new Error('方舟请求失败'), { status });
    }
    const payload = await response.json() as Record<string, unknown>;
    if (typeof payload.output_text === 'string') return payload.output_text;
    const output = Array.isArray(payload.output) ? payload.output : [];
    for (const entry of output) {
      if (!entry || typeof entry !== 'object') continue;
      const content = Array.isArray((entry as Record<string, unknown>).content) ? (entry as { content: unknown[] }).content : [];
      for (const part of content) if (part && typeof part === 'object' && typeof (part as Record<string, unknown>).text === 'string') return (part as Record<string, unknown>).text;
    }
    throw Object.assign(new Error('方舟响应缺少文本'), { status: 502 });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw Object.assign(new Error('方舟请求超时'), { status: 504 });
    throw error;
  } finally { clearTimeout(timer); }
}

