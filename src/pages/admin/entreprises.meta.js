// entreprises.meta.js - metadonnees partagees entre la page admin et le detail (3.3)
export const STATUT_META = {
  ACTIVE:    { label: 'Active',    variant: 'success' },
  SUSPENDUE: { label: 'Suspendue', variant: 'danger' },
};

export const TYPE_META = {
  PME:               { label: 'PME',                variant: 'primary' },
  GRANDE_ENTREPRISE: { label: 'Grande entreprise',  variant: 'info' },
  STARTUP:           { label: 'Startup',            variant: 'success' },
  ONG:               { label: 'ONG',                variant: 'warning' },
  ADMINISTRATION:    { label: 'Administration',     variant: 'danger' },
  AUTRE:             { label: 'Autre',              variant: 'default' },
};

export const TYPE_OPTIONS = Object.entries(TYPE_META).map(([value, m]) => ({ value, label: m.label }));