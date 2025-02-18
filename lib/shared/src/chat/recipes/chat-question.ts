import { CodebaseContext } from '../../codebase-context'
import {
    ContextFile,
    ContextMessage,
    createContextMessageByFile,
    getContextMessageWithResponse,
} from '../../codebase-context/messages'
import { ActiveTextEditorSelection, Editor } from '../../editor'
import { IntentDetector } from '../../intent-detector'
import { MAX_CURRENT_FILE_TOKENS, MAX_HUMAN_INPUT_TOKENS } from '../../prompt/constants'
import {
    populateCurrentEditorContextTemplate,
    populateCurrentEditorSelectedContextTemplate,
} from '../../prompt/templates'
import { truncateText } from '../../prompt/truncation'
import { createDisplayTextWithFileLinks } from '../prompts/display-text'
import { Interaction } from '../transcript/interaction'

import { isSingleWord, numResults } from './helpers'
import { Recipe, RecipeContext, RecipeID } from './recipe'

export class ChatQuestion implements Recipe {
    public id: RecipeID = 'chat-question'
    public title = 'Chat Question'

    constructor(private debug: (filterLabel: string, text: string, ...args: unknown[]) => void) {}

    public async getInteraction(humanChatInput: string, context: RecipeContext): Promise<Interaction | null> {
        const source = this.id
        const truncatedText = truncateText(humanChatInput, MAX_HUMAN_INPUT_TOKENS)

        const contextFiles = context.userInputContextFiles
        const displayText = contextFiles?.length
            ? createDisplayTextWithFileLinks(contextFiles, humanChatInput)
            : humanChatInput

        return Promise.resolve(
            new Interaction(
                { speaker: 'human', text: truncatedText, displayText, metadata: { source } },
                { speaker: 'assistant', metadata: { source } },
                this.getContextMessages(
                    truncatedText,
                    context.editor,
                    context.firstInteraction,
                    context.intentDetector,
                    context.codebaseContext,
                    context.editor.getActiveTextEditorSelection() || null,
                    context.userInputContextFiles
                ),
                []
            )
        )
    }

    private async getContextMessages(
        text: string,
        editor: Editor,
        firstInteraction: boolean,
        intentDetector: IntentDetector,
        codebaseContext: CodebaseContext,
        selection: ActiveTextEditorSelection | null,
        contextFiles?: ContextFile[]
    ): Promise<ContextMessage[]> {
        const contextMessages: ContextMessage[] = []
        // If input is less than 2 words, it means it's most likely a statement or a follow-up question that does not require additional context
        // e,g. "hey", "hi", "why", "explain" etc.
        const isTextTooShort = isSingleWord(text)
        if (isTextTooShort) {
            return contextMessages
        }

        const isCodebaseContextRequired = firstInteraction || (await intentDetector.isCodebaseContextRequired(text))

        this.debug('ChatQuestion:getContextMessages', 'isCodebaseContextRequired', isCodebaseContextRequired)
        if (isCodebaseContextRequired) {
            const codebaseContextMessages = await codebaseContext.getCombinedContextMessages(text, numResults)
            contextMessages.push(...codebaseContextMessages)
        }

        const isEditorContextRequired = intentDetector.isEditorContextRequired(text)
        this.debug('ChatQuestion:getContextMessages', 'isEditorContextRequired', isEditorContextRequired)
        if (isCodebaseContextRequired || isEditorContextRequired) {
            contextMessages.push(...ChatQuestion.getEditorContext(editor))
        }

        if (contextFiles?.length) {
            const contextFileMessages = await ChatQuestion.getContextFilesContext(editor, contextFiles)
            contextMessages.push(...contextFileMessages)
        }

        // Add selected text as context when available
        if (selection?.selectedText) {
            contextMessages.push(...ChatQuestion.getEditorSelectionContext(selection))
        }

        return contextMessages
    }

    public static getEditorContext(editor: Editor): ContextMessage[] {
        const visibleContent = editor.getActiveTextEditorVisibleContent()
        if (!visibleContent) {
            return []
        }
        const truncatedContent = truncateText(visibleContent.content, MAX_CURRENT_FILE_TOKENS)
        return getContextMessageWithResponse(
            populateCurrentEditorContextTemplate(truncatedContent, visibleContent.fileName, visibleContent.repoName),
            visibleContent
        )
    }

    public static getEditorSelectionContext(selection: ActiveTextEditorSelection): ContextMessage[] {
        const truncatedContent = truncateText(selection.selectedText, MAX_CURRENT_FILE_TOKENS)
        return getContextMessageWithResponse(
            populateCurrentEditorSelectedContextTemplate(truncatedContent, selection.fileName, selection.repoName),
            selection
        )
    }

    public static async getContextFilesContext(editor: Editor, contextFiles: ContextFile[]): Promise<ContextMessage[]> {
        const contextFileMessages = []
        for (const file of contextFiles) {
            if (file?.uri) {
                const content = await editor.getTextEditorContentForFile(file?.uri, file.range)
                if (content) {
                    const message = createContextMessageByFile(file, content)
                    contextFileMessages.push(...message)
                }
            }
        }
        return contextFileMessages
    }
}
