import { useState, useEffect } from 'react';
import { Network, Users } from 'lucide-react';
import { employerApi } from '../Api';
import { PageHeader, Card, Badge, Empty, Alert } from '../components/ui';
import OrgTree from '../components/org/OrgTree';
import toast from 'react-hot-toast';

export default function Organigramme() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    employerApi.organigramme()
      .then(res => {
        const d = res.data?.data || res.data;
        setData(Array.isArray(d) ? d : d?.content || []);
      })
      .catch(() => toast.error('Erreur chargement de l\'organigramme'))
      .finally(() => setLoading(false));
  }, []);

  const racines = data.filter(e =>
    !e.managerId || !data.some(x => x.id === e.managerId)
  ).length;

  return (
    <div>
      <PageHeader title="Organigramme" subtitle={`${data.length} employé${data.length !== 1 ? 's' : ''} — ${racines} racine${racines !== 1 ? 's' : ''}`}>
        <Badge variant="primary"><Network size={13} /> Hiérarchie</Badge>
      </PageHeader>

      <Card>
        {data.length === 0 ? (
          <Empty title="Aucun employé" description="Définissez d'abord des employés, puis leur supérieur hiérarchique dans la page Employés." icon={<Users size={22}/>} />
        ) : (
          <OrgTree data={data} loading={loading} />
        )}
      </Card>

      <Alert variant="info">💡 Le supérieur hiérarchique de chaque employé se définit dans la page
        <strong> Employés</strong> (champ « Supérieur hiérarchique » du formulaire).
        Un employé sans supérieur apparaît comme racine.</Alert>
    </div>
  );
}