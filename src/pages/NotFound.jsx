import { Link } from 'react-router-dom';
import { Home, Search } from 'lucide-react';
import { Button, Card, Empty, Flex } from '../components/ui';

export default function NotFound() {
  return (
    <Flex align="center" justify="center" style={{ minHeight:'100vh', background:'var(--bg-base)', padding:24 }}>
      <Card style={{ maxWidth:480, padding:'40px 24px', textAlign:'center', boxShadow:'var(--shadow-xl)' }}>
        <Empty
          icon={<div style={{
            width:64, height:64, borderRadius:'var(--radius-lg)',
            background:'var(--color-primary-light)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px',
          }}><Search size={32} style={{ color:'var(--color-primary)' }}/></div>}
          title={<span style={{ fontFamily:'var(--font-display)', fontSize:48, fontWeight:800, color:'var(--color-primary)', lineHeight:1 }}>404</span>}
          description="Page introuvable — La page que vous recherchez n'existe pas ou a été déplacée."
          action={<Link to="/" style={{ textDecoration:'none' }}><Button leftIcon={<Home size={16}/>}>Retour à l'accueil</Button></Link>}
        />
      </Card>
    </Flex>
  );
}