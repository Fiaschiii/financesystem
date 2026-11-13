import * as categoryService from '../services/categoryService.js'
import { asyncHandler } from '../middlewares/errorHandler.js'
import { ValidationError, parseUuid, parseText } from '../utils/validators.js'

// Lê e valida os campos da categoria.
// - criação (partial: false): nome é obrigatório
// - edição (partial: true): só valida o que foi enviado
function parseCategoryFields(body = {}, { partial }) {
  const fields = {}
  const sent = (key) => body[key] !== undefined

  if (!partial || sent('name')) {
    fields.name = parseText(body.name, 'Nome', { max: 60 })
  }
  if (!partial || sent('description')) {
    fields.description = parseText(body.description, 'Descrição', { max: 200, required: false })
  }

  if (partial && Object.keys(fields).length === 0) {
    throw new ValidationError('Informe ao menos um campo para atualizar.')
  }
  return fields
}

// GET /api/categories
export const list = asyncHandler(async (req, res) => {
  const categories = await categoryService.listCategories(req.supabase, req.user.id)
  res.json({ categories })
})

// POST /api/categories
export const create = asyncHandler(async (req, res) => {
  const fields = parseCategoryFields(req.body, { partial: false })
  const category = await categoryService.createCategory(req.supabase, req.user.id, fields)
  res.status(201).json({ category })
})

// PUT /api/categories/:id  (atualiza só os campos enviados)
export const update = asyncHandler(async (req, res) => {
  const id = parseUuid(req.params.id)
  const fields = parseCategoryFields(req.body, { partial: true })

  const category = await categoryService.updateCategory(req.supabase, req.user.id, id, fields)
  if (!category) {
    return res.status(404).json({ error: 'Categoria não encontrada.' })
  }
  res.json({ category })
})

// DELETE /api/categories/:id
export const remove = asyncHandler(async (req, res) => {
  const id = parseUuid(req.params.id)

  const deleted = await categoryService.deleteCategory(req.supabase, req.user.id, id)
  if (!deleted) {
    return res.status(404).json({ error: 'Categoria não encontrada.' })
  }
  res.status(204).end()
})
