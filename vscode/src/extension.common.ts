import * as vscode from 'vscode'

import { Recipe } from '@sourcegraph/cody-shared/src/chat/recipes/recipe'
import { Configuration } from '@sourcegraph/cody-shared/src/configuration'
import type { SourcegraphBrowserCompletionsClient } from '@sourcegraph/cody-shared/src/sourcegraph-api/completions/browserClient'
import type { SourcegraphNodeCompletionsClient } from '@sourcegraph/cody-shared/src/sourcegraph-api/completions/nodeClient'

import { CommandsController } from './commands/CommandsController'
import { BfgRetriever } from './completions/context/retrievers/bfg/bfg-retriever'
import { onActivationDevelopmentHelpers } from './dev/helpers'
import { ExtensionApi } from './extension-api'
import type { FilenameContextFetcher } from './local-context/filename-context-fetcher'
import type { LocalKeywordContextFetcher } from './local-context/local-keyword-context-fetcher'
import type { SymfRunner } from './local-context/symf'
import { start } from './main'
import type { getRgPath } from './rg'
import { captureException, SentryService } from './services/sentry/sentry'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T extends new (...args: any) => any> = T extends new (...args: infer A) => infer R
    ? (...args: A) => R
    : never

export interface PlatformContext {
    getRgPath?: typeof getRgPath
    createCommandsController?: Constructor<typeof CommandsController>
    createLocalKeywordContextFetcher?: Constructor<typeof LocalKeywordContextFetcher>
    createSymfRunner?: Constructor<typeof SymfRunner>
    createBfgRetriever?: () => BfgRetriever
    createFilenameContextFetcher?: Constructor<typeof FilenameContextFetcher>
    createCompletionsClient:
        | Constructor<typeof SourcegraphBrowserCompletionsClient>
        | Constructor<typeof SourcegraphNodeCompletionsClient>
    createSentryService?: (config: Pick<Configuration, 'serverEndpoint'>) => SentryService
    recipes: Recipe[]
    onConfigurationChange?: (configuration: Configuration) => void
}

export function activate(context: vscode.ExtensionContext, platformContext: PlatformContext): ExtensionApi {
    const api = new ExtensionApi()

    start(context, platformContext)
        .then(disposable => {
            if (!context.globalState.get('extension.hasActivatedPreviously')) {
                void context.globalState.update('extension.hasActivatedPreviously', 'true')
            }
            context.subscriptions.push(disposable)

            if (context.extensionMode === vscode.ExtensionMode.Development) {
                onActivationDevelopmentHelpers()
            }
        })
        .catch(error => {
            captureException(error)
            console.error(error)
        })

    return api
}
