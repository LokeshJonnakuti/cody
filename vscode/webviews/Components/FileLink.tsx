import React from 'react'

import { FileLinkProps } from '@sourcegraph/cody-ui/src/chat/components/EnhancedContext'

import { getVSCodeAPI } from '../utils/VSCodeApi'

import styles from './FileLink.module.css'

export const FileLink: React.FunctionComponent<FileLinkProps> = ({ path, range, source }) => {
    const pathWithRange = range?.end.line ? `${path}:${range?.start.line + 1}-${range?.end.line - 1}` : path

    return (
        <button
            className={styles.linkButton}
            type="button"
            title={`${pathWithRange} included via ${source}`}
            onClick={() => {
                getVSCodeAPI().postMessage({ command: 'openFile', filePath: path, range })
            }}
        >
            {`@${pathWithRange}`}
        </button>
    )
}
