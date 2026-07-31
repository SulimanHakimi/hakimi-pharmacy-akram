import { route, ok, fail, body } from '@/lib/route';
import { Prescription, nextSeq, logAct } from '@/lib/models';

export const dynamic = 'force-dynamic';

export const GET = route(async () => ok(await Prescription.find().sort({ date: -1 })), { perms: ['rx'] });

export const POST = route(async (request, { user }) => {
  const { patient, doctor, drugs } = await body(request);
  if (!patient?.trim() || !doctor?.trim() || !Array.isArray(drugs) || !drugs.length) {
    return fail('Patient, doctor and at least one drug are required');
  }

  const seq = await nextSeq('rx');
  const rx = await Prescription.create({
    rx: `RX-${String(seq).padStart(4, '0')}`, patient: patient.trim(), doctor: doctor.trim(),
    date: new Date(), drugs, status: 'Pending'
  });
  await logAct(user.name, `Recorded prescription for ${rx.patient}`);
  return ok(rx, 201);
}, { perms: ['rx'] });
