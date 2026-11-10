import type { InventoryCategory } from '../domain/inventory/types';

const keywordEmoji: Array<[readonly string[], string]> = [
  [['鸡蛋', '鸭蛋', '鹅蛋', '鹌鹑蛋', '蛋'], '🥚'],
  [['鸡肉', '鸡腿', '鸡翅'], '🍗'],
  [['鱼', '三文鱼', '鳕鱼', '鲈鱼'], '🐟'],
  [['虾'], '🦐'],
  [['猪肉', '牛肉', '羊肉', '排骨', '肉'], '🥩'],
  [['牛奶', '鲜奶', '酸奶'], '🥛'],
  [['苹果'], '🍎'],
  [['香蕉'], '🍌'],
  [['橙', '橘', '柑'], '🍊'],
  [['西瓜'], '🍉'],
  [['葡萄'], '🍇'],
  [['草莓'], '🍓'],
  [['桃'], '🍑'],
  [['梨'], '🍐'],
  [['西红柿', '番茄'], '🍅'],
  [['胡萝卜'], '🥕'],
  [['玉米'], '🌽'],
  [['蘑菇', '香菇'], '🍄'],
  [['土豆', '马铃薯'], '🥔'],
  [['茄子'], '🍆'],
  [['辣椒'], '🌶️'],
  [['面包', '吐司'], '🍞'],
  [['面条', '粉'], '🍜'],
  [['米饭', '大米'], '🍚'],
  [['饼干'], '🍪'],
  [['咖啡'], '☕'],
  [['茶'], '🍵'],
  [['果汁', '汽水', '饮料'], '🥤'],
];

const categoryEmoji: Record<InventoryCategory, string> = {
  vegetable: '🥬',
  fruit: '🍓',
  protein: '🥩',
  dairy: '🥛',
  dessert: '🍰',
  drink: '🥤',
  snack: '🍪',
  staple: '🍚',
  other: '🍽️',
};

export function getFoodEmoji(name: string, category: InventoryCategory): string {
  const normalizedName = name.trim();
  const match = keywordEmoji.find(([keywords]) => keywords.some((keyword) => normalizedName.includes(keyword)));
  return match?.[1] ?? categoryEmoji[category];
}
