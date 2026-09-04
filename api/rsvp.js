const BASE_ID = 'appPsi8lcVQwMtXhh';
const TABLE_ID = 'tblrtK02yr9gdZSLy';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { code, guest, maxSpots, attendance, count, message } = req.body || {};

    if (!code || !attendance) {
      return res.status(400).json({ error: 'Faltan datos de la invitación' });
    }

    const token = process.env.AIRTABLE_TOKEN;

    if (!token) {
      return res.status(500).json({ error: 'Falta AIRTABLE_TOKEN' });
    }

    const formula = `{Código}="${String(code).replace(/"/g, '\\"')}"`;

    const findUrl =
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}` +
      `?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`;

    const findResponse = await fetch(findUrl, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const findData = await findResponse.json();

    if (!findResponse.ok) {
      console.error('Airtable search error:', findData);
      return res.status(500).json({ error: 'No se pudo consultar Airtable' });
    }

    if (!findData.records || findData.records.length === 0) {
      return res.status(404).json({ error: 'Invitación no encontrada' });
    }

    const recordId = findData.records[0].id;

    const attending = attendance === 'yes';
    const confirmed = attending ? Number(count || 0) : 0;

    if (
      attending &&
      (!Number.isInteger(confirmed) ||
        confirmed < 1 ||
        confirmed > Number(maxSpots || 1))
    ) {
      return res.status(400).json({ error: 'Número de asistentes inválido' });
    }

    const fields = {
      'Estado RSVP': attending ? 'Sí asiste' : 'No asiste',
      'Lugares confirmados': confirmed,
      'Fecha de respuesta': new Date().toISOString(),
      'Notas': message || ''
    };

    const updateResponse = await fetch(
      `https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}/${recordId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
      }
    );

    const updateData = await updateResponse.json();

    if (!updateResponse.ok) {
      console.error('Airtable update error:', updateData);
      return res.status(500).json({ error: 'No se pudo guardar el RSVP' });
    }

    return res.status(200).json({
      ok: true,
      guest,
      attendance,
      count: confirmed
    });

  } catch (error) {
    console.error('RSVP error:', error);
    return res.status(500).json({ error: 'Error interno' });
  }
}
