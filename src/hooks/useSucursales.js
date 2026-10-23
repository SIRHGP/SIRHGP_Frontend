//
// Pilotage multi-succursales : un ADMIN gère PLUSIEURS agences, la succursale
// d'origine d'un enregistrement (facture, document, projet, tâche, événement,
// offre) sert donc à **filtrer / trier** ses listes — même logique que la colonne
// « Succursale » de la page Employés (3.4). Un MANAGER est déjà scopé à son agence
// par le backend : le filtre et le sélecteur ne lui sont pas proposés.
import { useEffect, useMemo, useState } from 'react';
import { sucursalApi, fetchAllPages } from '../Api';
import { useAuth } from '../contexts/Authcontext';

const MULTI_SUCCURSALE_ROLES = ['ADMIN', 'SUPER_ADMIN'];

/** Valeur du filtre « siège » (enregistrements sans succursale). */
export const SIEGE = '__siege__';

/**
 * Charge les succursales de l'entreprise courante et expose ce qu'il faut pour
 * filtrer / attribuer une agence dans les listes métier.
 */
export function useSucursales() {
  const { user } = useAuth();
  /** true = le compte voit plusieurs succursales → filtre + sélecteur utiles. */
  const showSucursal = MULTI_SUCCURSALE_ROLES.includes(user?.roleName);

  const [sucursales, setSucursales] = useState([]);

  useEffect(() => {
    if (!showSucursal) return;
    fetchAllPages(sucursalApi.getAll, 200)
      .then(setSucursales)
      .catch(() => setSucursales([]));
  }, [showSucursal]);

  /** Options d'un filtre : Toutes / Siège / chaque agence. */
  const optionsFiltre = useMemo(() => ([
    { value: '', label: 'Toutes les succursales' },
    { value: SIEGE, label: 'Siège (non rattaché)' },
    ...sucursales.map(s => ({ value: String(s.id), label: s.name })),
  ]), [sucursales]);

  /** Options d'un formulaire : vide = automatique (succursale du créateur) / inchangée. */
  const optionsFormulaire = useMemo(() => ([
    { value: '', label: 'Automatique (succursale du créateur)' },
    ...sucursales.map(s => ({ value: s.id, label: s.name })),
  ]), [sucursales]);

  /** Clé de filtre d'un enregistrement métier (sucursalId ou SIEGE). */
  const cleFiltre = (item) => (item?.sucursalId ? String(item.sucursalId) : SIEGE);

  /** `true` si l'enregistrement passe le filtre « succursale » courant. */
  const correspond = (item, filtre) => !filtre || cleFiltre(item) === filtre;

  // Le compte est-il ancré sur une agence (MANAGER/LEAD rattaché) ? Le backend
  // force SA succursale → le champ de formulaire est en lecture seule (SucursaleField).
  // NB : l'objet user vient de /auth/login (UserSummaryDTO) ou /auth/profile
  // (EmployerResponseDTO) — les deux exposent sucursalId + sucursalName.
  const sucursalUtilisateurId = user?.sucursalId ?? null;
  const sucursalUtilisateurNom = user?.sucursalName || user?.sucursalNom || null;

  return {
    sucursales, showSucursal, optionsFiltre, optionsFormulaire, cleFiltre, correspond, SIEGE,
    sucursalUtilisateurId, sucursalUtilisateurNom, compteAncre: sucursalUtilisateurId != null,
  };
}
