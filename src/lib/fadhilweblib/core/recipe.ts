import { composeStateSyntax, defineStateSyntax } from './state-syntax';
import { composeSyntax, defineSyntax } from './syntax';
import type { FadhilWebRecipe, SlotSyntax, SyntaxScalar } from './types';

function normalizeRecipeAttrs(attrs?: Record<string, SyntaxScalar | undefined>) {
  if (!attrs) {
    return undefined;
  }

  const result: Record<string, SyntaxScalar> = {};

  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }

    result[key] = value;
  }

  return Object.keys(result).length ? Object.freeze(result) : undefined;
}

function normalizeSlotSyntax<TSlots extends string>(slotSyntax?: SlotSyntax<TSlots>) {
  if (!slotSyntax) {
    return undefined;
  }

  const result: SlotSyntax<TSlots> = {};

  for (const [slot, syntax] of Object.entries(slotSyntax) as Array<[TSlots, SlotSyntax<TSlots>[TSlots]]>) {
    if (!syntax) {
      continue;
    }

    result[slot] = defineSyntax(syntax);
  }

  return Object.keys(result).length ? Object.freeze(result) as SlotSyntax<TSlots> : undefined;
}

export function defineRecipe<TSlots extends string, TLogic extends object = {}>(
  recipe: FadhilWebRecipe<TSlots, TLogic>,
) {
  const normalized = {
    syntax: recipe.syntax ? defineSyntax(recipe.syntax) : undefined,
    stateSyntax: recipe.stateSyntax ? defineStateSyntax(recipe.stateSyntax) : undefined,
    slotSyntax: normalizeSlotSyntax(recipe.slotSyntax),
    logic: recipe.logic ? Object.freeze({ ...recipe.logic }) : undefined,
    attrs: normalizeRecipeAttrs(recipe.attrs),
  };

  return Object.freeze(normalized) as FadhilWebRecipe<TSlots, TLogic>;
}

export function mergeRecipes<TSlots extends string, TLogic extends object = {}>(
  ...recipes: Array<FadhilWebRecipe<TSlots, TLogic> | undefined>
) {
  const slotSyntax: SlotSyntax<TSlots> = {};
  const logic: Partial<TLogic> = {};
  const attrs: Record<string, SyntaxScalar> = {};

  let hasSlotSyntax = false;
  let hasLogic = false;
  let hasAttrs = false;

  for (const recipe of recipes) {
    if (!recipe) {
      continue;
    }

    if (recipe.slotSyntax) {
      for (const [slot, syntax] of Object.entries(recipe.slotSyntax) as Array<[TSlots, SlotSyntax<TSlots>[TSlots]]>) {
        slotSyntax[slot] = composeSyntax(slotSyntax[slot], syntax);
        hasSlotSyntax = true;
      }
    }

    if (recipe.logic) {
      Object.assign(logic, recipe.logic);
      hasLogic = true;
    }

    if (recipe.attrs) {
      Object.assign(attrs, recipe.attrs);
      hasAttrs = true;
    }
  }

  return {
    syntax: composeSyntax(...recipes.map((recipe) => recipe?.syntax)),
    stateSyntax: composeStateSyntax(...recipes.map((recipe) => recipe?.stateSyntax)),
    slotSyntax: hasSlotSyntax ? slotSyntax : undefined,
    logic: hasLogic ? logic : undefined,
    attrs: hasAttrs ? attrs : undefined,
  } satisfies FadhilWebRecipe<TSlots, TLogic>;
}
