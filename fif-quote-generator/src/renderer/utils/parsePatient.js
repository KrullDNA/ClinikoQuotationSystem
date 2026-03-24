/**
 * Parse raw Cliniko patient data into a structured object for the UI.
 * Handles null-checks, custom fields, and formatting.
 */

function findSection(customFields, sectionName) {
  if (!customFields || !customFields.sections) return null;
  return customFields.sections.find(s => s.name === sectionName) || null;
}

function findField(section, fieldName) {
  if (!section || !section.fields) return null;
  return section.fields.find(f => f.name === fieldName && !f.archived) || null;
}

function getSelectedOption(field) {
  if (!field || !field.options) return null;
  const selected = field.options.find(o => o.selected === true);
  return selected ? selected.name : null;
}

function getFieldValue(field) {
  if (!field) return null;
  const val = field.value;
  if (val === null || val === undefined || (typeof val === 'string' && val.trim() === '')) return null;
  return val;
}

function formatDateAU(dateStr) {
  if (!dateStr) return null;
  // YYYY-MM-DD → DD/MM/YYYY
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatAddress(patient) {
  const lines = [];
  if (patient.address_1) lines.push(patient.address_1);
  if (patient.address_2) lines.push(patient.address_2);
  if (patient.address_3) lines.push(patient.address_3);

  const cityLine = [patient.city, patient.state, patient.post_code]
    .filter(Boolean)
    .join(' ');
  if (cityLine) lines.push(cityLine);

  return lines.length > 0 ? lines : null;
}

function formatPhone(patient) {
  if (!patient.patient_phone_numbers || patient.patient_phone_numbers.length === 0) {
    return null;
  }
  const phone = patient.patient_phone_numbers[0];
  if (!phone.number) return null;
  const type = phone.phone_type ? ` (${phone.phone_type})` : '';
  return `${phone.number}${type}`;
}

function formatFullName(patient) {
  const parts = [];
  if (patient.title) parts.push(patient.title);
  if (patient.first_name) parts.push(patient.first_name);
  if (patient.last_name) parts.push(patient.last_name);
  return parts.join(' ');
}

function nonEmpty(val) {
  if (val === null || val === undefined) return false;
  if (typeof val === 'string' && val.trim() === '') return false;
  return true;
}

export function parsePatient(raw) {
  if (!raw) return null;

  const customFields = raw.custom_fields || null;

  // Funding Scheme section
  const fundingSection = findSection(customFields, 'Funding Scheme');
  // EXACT match with typo: "Funding Schmes"
  const fundingTypeField = findField(fundingSection, 'Funding Schmes');
  const fundingScheme = getSelectedOption(fundingTypeField);
  const additionalFundingField = findField(fundingSection, 'Additional Funding Information');
  const additionalFunding = getFieldValue(additionalFundingField);

  // NDIS section
  const ndisSection = findSection(customFields, 'NDIS');
  const ndisNumberField = findField(ndisSection, 'NDIS Number');
  const ndisNumber = getFieldValue(ndisNumberField);
  const ndisPlanTypeField = findField(ndisSection, 'Plan Type');
  const ndisPlanType = getSelectedOption(ndisPlanTypeField);
  const ndisPlanManagerField = findField(ndisSection, 'Plan Manager');
  const ndisPlanManager = getFieldValue(ndisPlanManagerField);
  const ndisSupportCoordField = findField(ndisSection, 'Support Coordinator');
  const ndisSupportCoordinator = getFieldValue(ndisSupportCoordField);
  const ndisPlanDatesField = findField(ndisSection, 'Plan Dates');
  const ndisPlanDates = getFieldValue(ndisPlanDatesField);

  const preferredName = nonEmpty(raw.preferred_first_name) && raw.preferred_first_name !== raw.first_name
    ? raw.preferred_first_name
    : null;

  const invoiceEmail = nonEmpty(raw.invoice_email) && raw.invoice_email !== raw.email
    ? raw.invoice_email
    : null;

  return {
    // Internal ID for uploads — never displayed
    id: raw.id,

    // Display fields
    referenceNumber: raw.old_reference_id || '',
    fullName: formatFullName(raw),
    title: raw.title || null,
    firstName: raw.first_name || null,
    lastName: raw.last_name || null,
    preferredName,
    dateOfBirth: formatDateAU(raw.date_of_birth),
    rawDateOfBirth: raw.date_of_birth || null,
    email: nonEmpty(raw.email) ? raw.email : null,
    invoiceEmail,
    phone: formatPhone(raw),
    addressLines: formatAddress(raw),
    occupation: nonEmpty(raw.occupation) ? raw.occupation : null,
    notes: nonEmpty(raw.notes) ? raw.notes : null,
    invoiceExtraInfo: nonEmpty(raw.invoice_extra_information) ? raw.invoice_extra_information : null,

    // Funding
    fundingScheme,
    additionalFunding,

    // NDIS (only relevant if funding is NDIS)
    ndisNumber,
    ndisPlanType,
    ndisPlanManager,
    ndisSupportCoordinator,
    ndisPlanDates
  };
}
