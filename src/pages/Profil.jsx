import { useState } from 'react'
import { User, Lock, Bell, Camera } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/Authcontext'
import { employerApi } from '../Api' 
import { Card, Button, Input, Alert, Avatar, Badge } from '../components/ui'

export default function Profil() {
  const { user } = useAuth()
  const [tab, setTab] = useState('info')

  /* Changement mot de passe */
  const [pwForm, setPwForm] = useState({ ancien: '', nouveau: '', confirm: '' })
  const [pwSaving, setPwSaving] = useState(false)
  const [pwError, setPwError] = useState('')

  const handleChangePassword = async e => {
    e.preventDefault()
    setPwError('')
    if (!pwForm.ancien || !pwForm.nouveau) { setPwError('Tous les champs sont requis'); return }
    if (pwForm.nouveau !== pwForm.confirm)  { setPwError('Les mots de passe ne correspondent pas'); return }
    if (pwForm.nouveau.length < 8)          { setPwError('Minimum 8 caractères'); return }
    setPwSaving(true)
    try {
     await employerApi.changePassword(user.id, { 
    ancienMotDePasse: pwForm.ancien, 
    nouveauMotDePasse: pwForm.nouveau 
});
      toast.success('Mot de passe modifié avec succès')
      setPwForm({ ancien: '', nouveau: '', confirm: '' })
    } catch (err) {
      setPwError(err.message)
    } finally {
      setPwSaving(false)
    }
  }

  const tabs = [
    { id: 'info',     label: 'Informations', icon: <User size={15} /> },
    { id: 'password', label: 'Mot de passe', icon: <Lock size={15} /> },
    { id: 'notifs',   label: 'Notifications', icon: <Bell size={15} /> },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 }}>

      {/* En-tête profil */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ position: 'relative' }}>
            <Avatar name={user?.name || 'U'} size={72} />
            <button style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 24, height: 24, borderRadius: '50%',
              background: '#3b82f6', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg-card)',
            }}>
              <Camera size={11} />
            </button>
          </div>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{user?.name}</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>{user?.email}</p>
            <div style={{ display: 'flex', gap: 6 }}>
              {user?.roleName && <Badge variant="purple">{user.roleName}</Badge>}
              {user?.posteNom && <Badge variant="primary">{user.posteNom}</Badge>}
              {user?.departementNom && <Badge variant="default">{user.departementNom}</Badge>}
            </div>
          </div>
        </div>
      </Card>

      {/* Onglets */}
      <div style={{
        display: 'flex', gap: 2,
        background: 'var(--bg-hover)',
        borderRadius: 'var(--radius-md)',
        padding: 4,
        width: 'fit-content',
      }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 'var(--radius)',
            fontSize: 13, cursor: 'pointer',
            background: tab === t.id ? 'var(--bg-card)' : 'transparent',
            color: tab === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontWeight: tab === t.id ? 500 : 400,
            boxShadow: tab === t.id ? 'var(--shadow-sm)' : 'none',
            transition: 'all var(--transition)',
          }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Onglet — Informations */}
      {tab === 'info' && (
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Informations personnelles</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              ['Nom complet',     user?.name],
              ['Email',           user?.email],
              ['Rôle',            user?.roleName],
              ['Poste',           user?.posteNom],
              ['Département',     user?.departementNom],
              ['Téléphone',       user?.numeroTelephone],
              ['Région',          user?.region],
              ['Résidence',       user?.residence],
              ['Date d\'embauche',user?.dateEmbauche ? new Date(user.dateEmbauche).toLocaleDateString('fr-FR') : '—'],
            ].map(([label, val]) => (
              <div key={label} style={{
                padding: '12px',
                background: 'var(--bg-hover)',
                borderRadius: 'var(--radius-md)',
              }}>
                <p style={{
                  fontSize: 10, fontWeight: 600,
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  marginBottom: 4,
                }}>{label}</p>
                <p style={{ fontSize: 13, fontWeight: 500, color: val ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                  {val || '—'}
                </p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <Alert type="info">
              Pour modifier vos informations personnelles, contactez votre administrateur RH.
            </Alert>
          </div>
        </Card>
      )}

      {/* Onglet — Mot de passe */}
      {tab === 'password' && (
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Changer le mot de passe</h3>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
            Choisissez un mot de passe fort d'au moins 8 caractères.
          </p>
          <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 400 }}>
            {pwError && <Alert type="error">{pwError}</Alert>}
            <Input
              label="Mot de passe actuel"
              type="password"
              value={pwForm.ancien}
              onChange={e => setPwForm(f => ({ ...f, ancien: e.target.value }))}
              autoComplete="current-password"
            />
            <Input
              label="Nouveau mot de passe"
              type="password"
              value={pwForm.nouveau}
              onChange={e => setPwForm(f => ({ ...f, nouveau: e.target.value }))}
              hint="Minimum 8 caractères"
              autoComplete="new-password"
            />
            <Input
              label="Confirmer le nouveau mot de passe"
              type="password"
              value={pwForm.confirm}
              onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
              autoComplete="new-password"
            />
            <div>
              <Button type="submit" loading={pwSaving}>
                Changer le mot de passe
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Onglet — Notifications */}
      {tab === 'notifs' && (
        <Card>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Préférences de notification</h3>
          {[
            ['Nouvelles tâches assignées',    true],
            ['Tâches en retard',               true],
            ['Nouveaux commentaires',          false],
            ['Modifications de projet',        true],
            ['Factures à valider',             false],
            ['Événements à venir',             true],
          ].map(([label, defaultVal], i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 0',
              borderBottom: i < 5 ? '1px solid var(--border-light)' : 'none',
            }}>
              <span style={{ fontSize: 13 }}>{label}</span>
              <div style={{
                width: 36, height: 20, borderRadius: 10,
                background: defaultVal ? '#3b82f6' : 'var(--border)',
                position: 'relative', cursor: 'pointer',
                transition: 'background var(--transition)',
              }}>
                <div style={{
                  width: 16, height: 16, borderRadius: '50%',
                  background: '#fff', position: 'absolute',
                  top: 2, left: defaultVal ? 18 : 2,
                  transition: 'left var(--transition)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
            </div>
          ))}
          <div style={{ marginTop: 16 }}>
            <Button size="sm">Sauvegarder les préférences</Button>
          </div>
        </Card>
      )}
    </div>
  )
}