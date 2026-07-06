// Middleware GENÉRICO de validación con Zod.
// Recibe un schema y devuelve un middleware que valida req.body ANTES
// de que la petición llegue al controlador. Así los controladores
// trabajan siempre con datos limpios y tipados.
export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    // Respuesta 400 estructurada y amigable para el frontend:
    // cada error indica el campo exacto y un mensaje legible.
    return res.status(400).json({
      error: 'Validación fallida',
      details: result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      })),
    });
  }

  // Reemplazamos el body por la versión parseada por Zod
  // (con trims, lowercase y defaults ya aplicados).
  req.body = result.data;
  next();
};
