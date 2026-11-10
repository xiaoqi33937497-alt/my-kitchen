import { describe, expect, it } from 'vitest';
import { getFoodEmoji } from './foodEmoji';

describe('getFoodEmoji', () => {
  it.each(['鸡蛋', '鸭蛋', '鹌鹑蛋'])('matches egg name %s', (name) => {
    expect(getFoodEmoji(name, 'protein')).toBe('🥚');
  });

  it.each([
    ['苹果', 'fruit', '🍎'],
    ['香蕉', 'fruit', '🍌'],
    ['西红柿', 'vegetable', '🍅'],
    ['牛奶', 'drink', '🥛'],
    ['鱼肉', 'protein', '🐟'],
  ] as const)('matches common food %s', (name, category, emoji) => {
    expect(getFoodEmoji(name, category)).toBe(emoji);
  });

  it('ignores surrounding whitespace in a food name', () => {
    expect(getFoodEmoji('  鸡蛋  ', 'protein')).toBe('🥚');
  });

  it.each([
    ['沃集鲜水牛奶蛋糕', 'dairy', '🍰'],
    ['沃集鲜茉莉绝弦蛋白威化饼干', 'protein', '🍪'],
    ['沃集鲜榛子巧克力威化饼干', 'snack', '🍪'],
  ] as const)('prioritizes the complete food kind for %s', (name, category, emoji) => {
    expect(getFoodEmoji(name, category)).toBe(emoji);
  });

  it.each([
    ['vegetable', '🥬'],
    ['fruit', '🍓'],
    ['protein', '🥩'],
    ['drink', '🥤'],
    ['snack', '🍪'],
    ['staple', '🍚'],
    ['dairy', '🥛'],
    ['dessert', '🍰'],
    ['other', '🍽️'],
  ] as const)('falls back for category %s', (category, emoji) => {
    expect(getFoodEmoji('未识别食物', category)).toBe(emoji);
  });
});
