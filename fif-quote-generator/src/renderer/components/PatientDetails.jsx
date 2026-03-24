import React from 'react';

function DetailRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex py-1.5 text-sm">
      <span className="text-slate-500 w-40 flex-shrink-0">{label}</span>
      <span className="text-slate-800">{value}</span>
    </div>
  );
}

function AddressRow({ label, lines }) {
  if (!lines || lines.length === 0) return null;
  return (
    <div className="flex py-1.5 text-sm">
      <span className="text-slate-500 w-40 flex-shrink-0">{label}</span>
      <div className="text-slate-800">
        {lines.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
    </div>
  );
}

function NoteBox({ label, value }) {
  if (!value) return null;
  return (
    <div className="mt-3 bg-slate-50 border border-slate-200 rounded-lg p-3">
      <p className="text-xs font-medium text-slate-500 mb-1">{label}</p>
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{value}</p>
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="mt-4 mb-2 pt-3 border-t border-slate-100">
      <h4 className="text-xs font-semibold text-brand-500 uppercase tracking-wide">{title}</h4>
    </div>
  );
}

export default function PatientDetails({ patient }) {
  if (!patient) return null;

  const showNdis = patient.fundingScheme === 'NDIS' && (
    patient.ndisNumber || patient.ndisPlanType || patient.ndisPlanManager ||
    patient.ndisSupportCoordinator || patient.ndisPlanDates
  );

  const hasFunding = patient.fundingScheme || patient.additionalFunding;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 mt-4">
      {/* Header with name + ref */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">{patient.fullName}</h3>
          {patient.preferredName && (
            <p className="text-sm text-slate-500">
              Preferred: <span className="text-slate-700">{patient.preferredName}</span>
            </p>
          )}
        </div>
        <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded">
          Ref: {patient.referenceNumber}
        </span>
      </div>

      {/* Standard fields */}
      <div className="divide-y divide-slate-50">
        <DetailRow label="Date of Birth" value={patient.dateOfBirth} />
        <DetailRow label="Email" value={patient.email} />
        <DetailRow label="Invoice Email" value={patient.invoiceEmail} />
        <DetailRow label="Phone" value={patient.phone} />
        <AddressRow label="Address" lines={patient.addressLines} />
        <DetailRow label="Occupation" value={patient.occupation} />
      </div>

      {/* Notes */}
      <NoteBox label="Patient Notes" value={patient.notes} />
      <NoteBox label="Invoice Extra Information" value={patient.invoiceExtraInfo} />

      {/* Funding section */}
      {hasFunding && (
        <>
          <SectionHeader title="Funding" />
          <div className="divide-y divide-slate-50">
            <DetailRow label="Funding Type" value={patient.fundingScheme} />
            <DetailRow label="Additional Info" value={patient.additionalFunding} />
          </div>
        </>
      )}

      {/* NDIS section — only if funding is NDIS */}
      {showNdis && (
        <>
          <SectionHeader title="NDIS Details" />
          <div className="divide-y divide-slate-50">
            <DetailRow label="NDIS Number" value={patient.ndisNumber} />
            <DetailRow label="Plan Type" value={patient.ndisPlanType} />
            <DetailRow label="Plan Manager" value={patient.ndisPlanManager} />
            <DetailRow label="Support Coordinator" value={patient.ndisSupportCoordinator} />
            <DetailRow label="Plan Dates" value={patient.ndisPlanDates} />
          </div>
        </>
      )}
    </div>
  );
}
