import { MapPin } from 'lucide-react';
import { useAuth } from '../../contexts/Authcontext';
import { Badge } from './Badge';

/** Rôles qui voient plusieurs succursales : ADMIN = entreprise, SUPER_ADMIN = plateforme. */
const MULTI_SUCCURSALE_ROLES = ['ADMIN', 'SUPER_ADMIN'];

export function SucursaleBadge({ sucursalNom, size = 'sm', forceVisible = false }) {
  const { user } = useAuth();
  if (!forceVisible && !MULTI_SUCCURSALE_ROLES.includes(user?.roleName)) return null;

  const titre = sucursalNom
    ? `Rattachée à la succursale « ${sucursalNom} »`
    : 'Aucune succursale rattachée (siège / données antérieures au rattachement 5.9)';
  return (
    <span title={titre} style={{ display: 'inline-flex' }}>
      <Badge variant={sucursalNom ? 'info' : 'default'} size={size}>
        <MapPin size={11} />
        {sucursalNom || 'Siège'}
      </Badge>
    </span>
  );
}
