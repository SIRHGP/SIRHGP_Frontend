//
// Champ « Succursale d'origine » des formulaires de création / modification.
// - ADMIN / SUPER_ADMIN : sélecteur éditable — il pilote plusieurs agences, il
//   impute donc l'enregistrement à celle qu'il choisit.
// - MANAGER / LEAD (compte ancré sur une agence) : champ en lecture seule qui
//   affiche SON agence. Le backend force la sienne (SucursalAttributionService) :
//   afficher un champ vide ou masquable serait trompeur pour lui.
// - Compte non rattaché : l'info « → Siège » rend l'attribution lisible.
import { Select } from './fields';

const noop = () => {};

export function SucursaleField({
  showSucursal,
  value,
  onChange,
  options = [],
  label = "Succursale d'origine",
  compteAncre = false,
  sucursalUtilisateurNom = null,
  style,
}) {
  if (showSucursal) {
    return <Select label={label} value={value ?? ''} onChange={onChange} options={options} style={style} />;
  }
  const info = compteAncre
    ? `${sucursalUtilisateurNom || 'Votre agence'} — attribution automatique`
    : 'Aucune succursale rattachée à votre compte → Siège';
  return (
    <Select
      label={compteAncre ? `${label} — votre agence` : label}
      value=""
      onChange={noop}
      options={[]}
      placeholder={info}
      disabled
      title="Seul un ADMIN peut imputer une autre agence"
      style={style}
    />
  );
}
