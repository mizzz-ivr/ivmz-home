'use client'

import { useForm } from '@payloadcms/ui'
import { useEffect, useMemo, useState } from 'react'

type Draft = { githubUrl: string; stack: string[]; summary: string; title: string }
type Repo = {
  archived: boolean
  description: string | null
  draft: Draft
  fork: boolean
  name: string
  stars: number
  url: string
}

type State = { status: 'loading' } | { status: 'ready'; repos: Repo[] } | { status: 'unavailable' }

const isEmpty = (value: unknown) =>
  value === undefined ||
  value === null ||
  value === '' ||
  (Array.isArray(value) && value.length === 0)

/**
 * Picks one of the owner's public GitHub repositories and fills the Work's GitHub URL. Title,
 * summary and stack are only filled when they are still empty, so an edited Work is never
 * overwritten. Nothing is saved until the editor saves the Work.
 */
export function GithubRepoPicker() {
  const { dispatchFields, getDataByPath, setModified } = useForm()
  const [state, setState] = useState<State>({ status: 'loading' })
  const [selected, setSelected] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/github-repos', { credentials: 'same-origin' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { repos?: Repo[]; unavailable?: boolean } | null) => {
        if (cancelled) return
        setState(
          data && !data.unavailable && Array.isArray(data.repos)
            ? { status: 'ready', repos: data.repos }
            : { status: 'unavailable' },
        )
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'unavailable' })
      })
    return () => {
      cancelled = true
    }
  }, [])

  const visible = useMemo(
    () =>
      state.status === 'ready'
        ? state.repos.filter((repo) => showAll || (!repo.fork && !repo.archived))
        : [],
    [showAll, state],
  )

  const apply = () => {
    if (state.status !== 'ready') return
    const repo = state.repos.find((item) => item.url === selected)
    if (!repo) return

    const set = (path: string, value: unknown) => dispatchFields({ path, type: 'UPDATE', value })
    set('githubUrl', repo.draft.githubUrl)

    const filled = ['GitHub URL']
    const fillIfEmpty = (path: string, label: string, value: unknown) => {
      if (isEmpty(getDataByPath(path)) && !isEmpty(value)) {
        set(path, value)
        filled.push(label)
      }
    }
    fillIfEmpty('title', 'Title', repo.draft.title)
    fillIfEmpty('summary', 'Summary', repo.draft.summary)
    fillIfEmpty('stack', 'Stack', repo.draft.stack)

    setModified(true)
    setMessage(`入力しました: ${filled.join(' / ')}。内容を確認して保存してください。`)
  }

  return (
    <div
      style={{
        border: '1px solid var(--theme-elevation-150)',
        borderRadius: 8,
        margin: '0 0 24px',
        padding: 16,
      }}
    >
      <p style={{ fontWeight: 700, margin: '0 0 4px' }}>GitHub から選ぶ</p>
      <p style={{ color: 'var(--theme-elevation-500)', fontSize: 13, margin: '0 0 12px' }}>
        公開しているリポジトリから選ぶと、GitHub URL
        が入ります。タイトル・概要・技術が空のときは、リポジトリの情報も入ります（入力済みの内容は上書きしません）。
      </p>

      {state.status === 'loading' ? <p>読み込み中…</p> : null}
      {state.status === 'unavailable' ? (
        <p role="status">
          リポジトリの一覧を取得できませんでした。時間を置いて、ページを開き直してください。URL
          は、下の「GitHub URL」へ直接入力もできます。
        </p>
      ) : null}

      {state.status === 'ready' ? (
        <>
          <div style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <label htmlFor="github-repo-picker" style={{ position: 'absolute', left: -9999 }}>
              リポジトリ
            </label>
            <select
              id="github-repo-picker"
              onChange={(event) => {
                setSelected(event.target.value)
                setMessage('')
              }}
              style={{ flex: '1 1 260px', minHeight: 36 }}
              value={selected}
            >
              <option value="">リポジトリを選択…</option>
              {visible.map((repo) => (
                <option key={repo.url} value={repo.url}>
                  {repo.name}
                  {repo.fork ? '（fork）' : ''}
                  {repo.archived ? '（archived）' : ''}
                  {repo.description ? ` — ${repo.description.slice(0, 60)}` : ''}
                </option>
              ))}
            </select>
            <button disabled={!selected} onClick={apply} style={{ minHeight: 36 }} type="button">
              この内容を入力する
            </button>
          </div>
          <label style={{ display: 'inline-flex', fontSize: 13, gap: 6, marginTop: 8 }}>
            <input
              checked={showAll}
              onChange={(event) => setShowAll(event.target.checked)}
              type="checkbox"
            />
            fork・archived も表示する
          </label>
        </>
      ) : null}

      {message ? (
        <p role="status" style={{ margin: '10px 0 0' }}>
          {message}
        </p>
      ) : null}
    </div>
  )
}
