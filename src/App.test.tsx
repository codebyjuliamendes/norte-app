import { describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'

async function enterLocalMode() {
  const user = userEvent.setup()
  render(<App />)
  await user.click(await screen.findByRole('button', { name: /começar no modo local/i }))
  await screen.findByText(/modo local: seus dados ficam salvos apenas neste navegador/i)
  return user
}

describe('App (local mode)', () => {
  it('shows the local-mode entry when Supabase is not configured', async () => {
    render(<App />)
    expect(await screen.findByRole('heading', { name: 'Modo local' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/endereço de e-mail/i)).not.toBeInTheDocument()
  })

  it('creates, completes and deletes a task', async () => {
    const user = await enterLocalMode()

    await user.click(screen.getByRole('button', { name: /nova tarefa/i, expanded: false }))
    await user.type(screen.getByLabelText('Título da tarefa'), 'Entregar relatório')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))

    const list = await screen.findByRole('list', { name: 'Lista de tarefas' })
    expect(within(list).getByText('Entregar relatório')).toBeInTheDocument()

    await user.click(within(list).getByRole('checkbox', { name: /entregar relatório/i }))
    await waitFor(() =>
      expect(within(list).getByRole('checkbox', { name: /entregar relatório/i })).toHaveAttribute('aria-checked', 'true'),
    )

    await user.click(within(list).getByRole('button', { name: /excluir "entregar relatório"/i }))
    await waitFor(() => expect(screen.queryByText('Entregar relatório')).not.toBeInTheDocument())
  })

  it('rejects a blank task title', async () => {
    const user = await enterLocalMode()
    await user.click(screen.getByRole('button', { name: /nova tarefa/i, expanded: false }))
    await user.type(screen.getByLabelText('Título da tarefa'), '   ')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(/não pode ficar vazio/i)
  })

  it('persists data across reloads in the same browser', async () => {
    const user = await enterLocalMode()
    await user.click(screen.getByRole('button', { name: /nova tarefa/i, expanded: false }))
    await user.type(screen.getByLabelText('Título da tarefa'), 'Persistente')
    await user.click(screen.getByRole('button', { name: 'Salvar' }))
    await screen.findByText('Persistente')

    // Simulate a reload: unmount and render again (localStorage is kept within the test).
    const stored = { ...window.localStorage }
    document.body.innerHTML = ''
    for (const [k, v] of Object.entries(stored)) window.localStorage.setItem(k, v as string)
    render(<App />)
    expect(await screen.findByText('Persistente')).toBeInTheDocument()
  })

  it('navigates with keyboard shortcuts and lists the real mapping', async () => {
    const user = await enterLocalMode()
    await user.keyboard('4')
    expect(await screen.findByRole('heading', { name: 'Agenda & Prazos' })).toBeInTheDocument()

    await user.keyboard('?')
    const dialog = await screen.findByRole('dialog', { name: /atalhos de teclado/i })
    expect(within(dialog).getByText('Ir para Agenda')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('adds a habit and checks it in for today', async () => {
    const user = await enterLocalMode()
    await user.click(screen.getByRole('button', { name: 'Hábitos' }))
    await user.click(await screen.findByRole('button', { name: /novo hábito/i }))
    await user.type(screen.getByLabelText('Nome do hábito'), 'Meditar')
    await user.click(screen.getByRole('button', { name: /salvar hábito/i }))

    const checkboxes = await screen.findAllByRole('checkbox', { name: /^Meditar em/ })
    expect(checkboxes).toHaveLength(7)
    const today = checkboxes[6]
    await user.click(today)
    await waitFor(() =>
      expect(screen.getAllByRole('checkbox', { name: /^Meditar em/ })[6]).toHaveAttribute('aria-checked', 'true'),
    )
  })

  it('saves the journal once per day and updates it afterwards', async () => {
    const user = await enterLocalMode()
    await user.click(screen.getByRole('button', { name: 'Diário' }))
    await user.type(await screen.findByLabelText('Gratidão 1'), 'Café quente')
    await user.click(screen.getByRole('button', { name: /salvar registro diário/i }))
    expect(await screen.findByRole('button', { name: /atualizar registro de hoje|registro salvo/i })).toBeInTheDocument()
    expect(await screen.findByText('Café quente', { selector: 'li' })).toBeInTheDocument()
  })

  it('validates goal values before saving', async () => {
    const user = await enterLocalMode()
    await user.click(screen.getByRole('button', { name: 'Metas' }))
    await user.click(await screen.findByRole('button', { name: /nova meta/i }))
    await user.type(screen.getByLabelText('Meta'), 'Ler livros')
    await user.type(screen.getByLabelText('Data Alvo'), '2026-12-31')
    const target = screen.getByLabelText('Valor Meta')
    await user.clear(target)
    await user.type(target, '12')
    await user.click(screen.getByRole('button', { name: /salvar meta/i }))
    expect(await screen.findByText('Ler livros')).toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: /ler livros/i })).toHaveAttribute('aria-valuenow', '0')
  })
})
