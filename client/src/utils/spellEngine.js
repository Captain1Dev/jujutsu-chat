export const SPELL_RECIPES = [
  {
    id: 'fireball',
    label: 'Fireball',
    sequence: ['tiger', 'bird', 'dragon'],
  },
  {
    id: 'water_dragon',
    label: 'Water Dragon',
    sequence: ['tiger', 'snake', 'ram'],
  },
  {
    id: 'earth_wall',
    label: 'Earth Wall',
    sequence: ['boar', 'dragon', 'bird'],
  },
];

const WINDOW_MS = 3000;
const HOLD_MS = 700;

function getMatchingRecipes(progress) {
  return SPELL_RECIPES.filter((recipe) => {
    if (progress.length > recipe.sequence.length) return false;
    return progress.every((sign, index) => sign === recipe.sequence[index]);
  });
}

/**
 * Tracks multiple spell sequences within a 3-second window.
 */
export function createSpellEngine(onCast) {
  let progress = [];
  let windowStart = 0;
  let lastSign = null;
  let lastSignAt = 0;
  let activeRecipeIds = SPELL_RECIPES.map((recipe) => recipe.id);

  const reset = () => {
    progress = [];
    windowStart = 0;
    lastSign = null;
    lastSignAt = 0;
    activeRecipeIds = SPELL_RECIPES.map((recipe) => recipe.id);
  };

  const push = (sign) => {
    if (!sign) {
      return {
        progress: [...progress],
        cast: null,
        activeRecipeIds: [...activeRecipeIds],
      };
    }

    const now = Date.now();

    if (sign === lastSign && now - lastSignAt < HOLD_MS) {
      return {
        progress: [...progress],
        cast: null,
        activeRecipeIds: [...activeRecipeIds],
      };
    }

    if (!windowStart || now - windowStart > WINDOW_MS) {
      progress = [];
      activeRecipeIds = SPELL_RECIPES.map((recipe) => recipe.id);
      windowStart = now;
    }

    const nextProgress = [...progress, sign];
    const matchingRecipes = getMatchingRecipes(nextProgress);
    let cast = null;

    if (matchingRecipes.length > 0) {
      const completed = matchingRecipes.find(
        (recipe) => recipe.sequence.length === nextProgress.length,
      );

      if (completed) {
        cast = completed.id;
        onCast?.(cast);
        reset();
        return { progress: [], cast, activeRecipeIds: [] };
      }

      progress = nextProgress;
      activeRecipeIds = matchingRecipes.map((recipe) => recipe.id);
      lastSign = sign;
      lastSignAt = now;
    } else {
      const restartMatches = getMatchingRecipes([sign]);
      if (restartMatches.length > 0) {
        progress = [sign];
        windowStart = now;
        activeRecipeIds = restartMatches.map((recipe) => recipe.id);
        lastSign = sign;
        lastSignAt = now;
      } else {
        progress = [];
        activeRecipeIds = [];
        windowStart = 0;
        lastSign = sign;
        lastSignAt = now;
      }
    }

    return {
      progress: [...progress],
      cast,
      activeRecipeIds: [...activeRecipeIds],
    };
  };

  return {
    push,
    reset,
    getProgress: () => [...progress],
    getActiveRecipeIds: () => [...activeRecipeIds],
  };
}
