export const DEFAULT_MAX_TOKENS = 7000
export const ANSWER_TOKENS = 1000
export const CODY_INTRO_TOKENS = 1000
export const MAX_HUMAN_INPUT_TOKENS = 1000
export const MAX_RECIPE_INPUT_TOKENS = 2000
export const MAX_CURRENT_FILE_TOKENS = 1000
export const MAX_RECIPE_SURROUNDING_TOKENS = 500
export const MAX_AVAILABLE_PROMPT_LENGTH = DEFAULT_MAX_TOKENS - ANSWER_TOKENS - CODY_INTRO_TOKENS
export const CHARS_PER_TOKEN = 4
export const SURROUNDING_LINES = 50
export const NUM_CODE_RESULTS = 12
export const NUM_TEXT_RESULTS = 3

export function tokensToChars(tokens: number): number {
    return tokens * CHARS_PER_TOKEN
}
