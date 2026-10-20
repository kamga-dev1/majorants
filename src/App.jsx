import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert, AlertIcon, Avatar, Badge, Box, Button, Card, CardBody, Divider,
  Flex, FormControl, FormLabel, Heading, HStack, Input, InputGroup, InputLeftElement,
  Select, SimpleGrid, Stack, Tab, TabList, TabPanel, TabPanels, Tabs, Text, useToast, VStack,
} from '@chakra-ui/react';
import {
  BookOpen, CalendarDays, Check, ChevronRight, CircleDollarSign, Clock3, GraduationCap,
  LogOut, RefreshCw, Search, Settings2, UsersRound, Wifi, WifiOff, X,
} from 'lucide-react';

const roles = ['PROMOTEUR', 'DIRECTEUR', 'SECRETAIRE', 'ENSEIGNANT', 'PARENT', 'ELEVE'];
const labels = { PROMOTEUR: 'Promoteur', DIRECTEUR: 'Directeur', SECRETAIRE: 'Secrétaire', ENSEIGNANT: 'Enseignant', PARENT: 'Parent', ELEVE: 'Élève' };
const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
const apiUrl = (path) => `${apiBaseUrl}${path}`;
const cacheKey = (username, key) => `majorants.${encodeURIComponent(username)}.${key}`;

function readCache(username, key) {
  if (!username) return [];
  try { return JSON.parse(localStorage.getItem(cacheKey(username, key)) || '[]'); } catch { return []; }
}

function readAuth() {
  try { return JSON.parse(sessionStorage.getItem('majorants.auth') || 'null'); } catch { return null; }
}

function localDate() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function App() {
  const toast = useToast();
  const [auth, setAuth] = useState(readAuth);
  const [login, setLogin] = useState({ username: '', password: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [activeSection, setActiveSection] = useState(0);
  const [students, setStudents] = useState(() => readCache(readAuth()?.username, 'students'));
  const [attendance, setAttendance] = useState(() => readCache(readAuth()?.username, 'attendance'));
  const [payments, setPayments] = useState(() => readCache(readAuth()?.username, 'payments'));
  const [users, setUsers] = useState([]);
  const [busy, setBusy] = useState(false);
  const [studentForm, setStudentForm] = useState({ name: '', schoolClass: '', guardianName: '', phone: '' });
  const [attendanceForm, setAttendanceForm] = useState({ studentId: '', arrivalTime: '', departureTime: '', status: 'PRESENT' });
  const [paymentForm, setPaymentForm] = useState({ studentId: '', amount: '', dueDate: '', status: 'PAYE', note: '' });
  const [userForm, setUserForm] = useState({ username: '', password: '', role: 'ENSEIGNANT', schoolClass: '', studentId: '' });

  const api = useCallback(async (path, options = {}) => {
    if (!auth?.header) throw new Error('Veuillez vous connecter.');
    const response = await fetch(apiUrl(path), {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: auth.header, ...options.headers },
    });
    if (!response.ok) {
      const body = await response.text();
      throw new Error(body || `Erreur ${response.status}`);
    }
    return response.status === 204 ? null : response.json();
  }, [auth]);

  const loadData = useCallback(async () => {
    if (!auth) return;
    try {
      const [studentData, attendanceData, paymentData] = await Promise.all([
        api('/api/students'), api('/api/attendance'), api('/api/payments'),
      ]);
      setStudents(studentData); setAttendance(attendanceData); setPayments(paymentData);
      localStorage.setItem(cacheKey(auth.username, 'students'), JSON.stringify(studentData));
      localStorage.setItem(cacheKey(auth.username, 'attendance'), JSON.stringify(attendanceData));
      localStorage.setItem(cacheKey(auth.username, 'payments'), JSON.stringify(paymentData));
      if (['PROMOTEUR', 'DIRECTEUR'].includes(auth.role)) setUsers(await api('/api/users'));
    } catch (error) {
      if (error instanceof TypeError) setOffline(true);
      else if (navigator.onLine) toast({ title: 'Synchronisation impossible', description: error.message, status: 'error', duration: 5000 });
    }
  }, [api, auth, toast]);

  const syncQueue = useCallback(async () => {
    if (!auth || !navigator.onLine) return;
    const queue = JSON.parse(localStorage.getItem(cacheKey(auth.username, 'queue')) || '[]');
    if (!queue.length) return;
    const failed = [];
    for (const item of queue) {
      try { await api(item.path, { method: 'POST', body: JSON.stringify(item.body) }); }
      catch { failed.push(item); }
    }
    localStorage.setItem(cacheKey(auth.username, 'queue'), JSON.stringify(failed));
    if (failed.length) {
      toast({ title: 'Synchronisation partielle', description: `${failed.length} opération(s) restent à envoyer.`, status: 'warning', duration: 5000 });
    }
    if (queue.length !== failed.length) {
      toast({ title: 'Synchronisation effectuée', description: `${queue.length - failed.length} opération(s) envoyée(s).`, status: 'success', duration: 3000 });
      await loadData();
    }
  }, [api, auth, loadData, toast]);

  useEffect(() => {
    const online = () => { setOffline(false); syncQueue(); loadData(); };
    const offlineEvent = () => setOffline(true);
    window.addEventListener('online', online);
    window.addEventListener('offline', offlineEvent);
    if (auth && navigator.onLine) { loadData(); syncQueue(); }
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offlineEvent); };
  }, [auth, loadData, syncQueue]);

  const canManage = ['PROMOTEUR', 'DIRECTEUR', 'SECRETAIRE'].includes(auth?.role);
  const canManageUsers = ['PROMOTEUR', 'DIRECTEUR'].includes(auth?.role);
  const canTakeAttendance = ['PROMOTEUR', 'DIRECTEUR', 'SECRETAIRE', 'ENSEIGNANT'].includes(auth?.role);
  const stats = useMemo(() => ({
    students: students.length,
    present: attendance.filter((entry) => entry.date === localDate() && entry.status !== 'ABSENT').length,
    unpaid: payments.filter((entry) => entry.status === 'EN_ATTENTE').length,
  }), [students, attendance, payments]);
  const normalizedSearch = searchTerm.trim().toLocaleLowerCase('fr');
  const visibleStudents = useMemo(() => students.filter((student) =>
    `${student.name} ${student.schoolClass} ${student.guardianName || ''} ${student.phone || ''}`.toLocaleLowerCase('fr').includes(normalizedSearch)),
  [students, normalizedSearch]);
  const visibleAttendance = useMemo(() => attendance.filter((record) =>
    `${record.studentName} ${record.date} ${record.status}`.toLocaleLowerCase('fr').includes(normalizedSearch)),
  [attendance, normalizedSearch]);
  const visiblePayments = useMemo(() => payments.filter((record) =>
    `${record.studentName} ${record.paymentDate || ''} ${record.dueDate || ''} ${record.status}`.toLocaleLowerCase('fr').includes(normalizedSearch)),
  [payments, normalizedSearch]);
  const visibleUsers = useMemo(() => users.filter((user) =>
    `${user.username} ${labels[user.role] || user.role}`.toLocaleLowerCase('fr').includes(normalizedSearch)),
  [users, normalizedSearch]);
  const navigationItems = [
    { label: 'Élèves', icon: GraduationCap, section: 0 },
    { label: 'Présences', icon: Check, section: 1 },
    { label: 'Paiements', icon: CircleDollarSign, section: 2 },
    ...(canManageUsers ? [{ label: 'Comptes utilisateurs', icon: UsersRound, section: 3 }] : []),
  ];

  async function signIn(event) {
    event.preventDefault(); setBusy(true);
    const bytes = new TextEncoder().encode(`${login.username}:${login.password}`);
    const header = `Basic ${btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(''))}`;
    try {
      const response = await fetch(apiUrl('/api/auth/me'), { headers: { Authorization: header } });
      if (response.status === 401 || response.status === 403) {
        throw new Error('Identifiant ou mot de passe incorrect.');
      }
      if (!response.ok) {
        throw new Error(`Le serveur de données a répondu avec l’erreur ${response.status}. Vérifiez son déploiement.`);
      }
      const profile = await response.json();
      const session = { ...profile, header };
      sessionStorage.setItem('majorants.auth', JSON.stringify(session));
      setStudents(readCache(session.username, 'students'));
      setAttendance(readCache(session.username, 'attendance'));
      setPayments(readCache(session.username, 'payments'));
      setAuth(session);
    } catch (error) {
      const description = error instanceof TypeError
        ? 'Serveur de données inaccessible. Vérifiez son adresse et sa configuration CORS.'
        : error.message;
      toast({ title: 'Connexion refusée', description, status: 'error' });
    } finally { setBusy(false); }
  }

  function signOut() {
    sessionStorage.removeItem('majorants.auth');
    setAuth(null);
    setStudents([]); setAttendance([]); setPayments([]);
    setUsers([]);
  }

  function queueOffline(path, record, update) {
    const queueStorageKey = cacheKey(auth.username, 'queue');
    const queue = JSON.parse(localStorage.getItem(queueStorageKey) || '[]');
    localStorage.setItem(queueStorageKey, JSON.stringify([...queue, { path, body: record }]));
    const recordType = path.split('/').pop();
    if (['students', 'attendance', 'payments'].includes(recordType)) {
      localStorage.setItem(cacheKey(auth.username, recordType), JSON.stringify([record, ...readCache(auth.username, recordType)]));
    }
    update((current) => [record, ...current]);
    toast({ title: 'Enregistré hors ligne', description: 'La saisie sera envoyée au retour du Wi‑Fi local.', status: 'info' });
  }

  async function saveRecord(path, body, update) {
    const record = { ...body, id: crypto.randomUUID() };
    if (!navigator.onLine) {
      queueOffline(path, record, update);
      return;
    }
    try {
      await api(path, { method: 'POST', body: JSON.stringify(record) });
      await loadData();
      toast({ title: 'Enregistrement effectué', status: 'success', duration: 2500 });
    } catch (error) {
      if (error instanceof TypeError) {
        setOffline(true);
        queueOffline(path, record, update);
      } else {
        toast({ title: 'Enregistrement impossible', description: error.message, status: 'error' });
      }
    }
  }

  if (!auth) return (
    <Flex minH="100vh" className="login-screen" align="center" justify="center" p={4}>
      <Card w="full" maxW="md" className="login-card">
        <CardBody p={8}>
          <VStack align="stretch" spacing={5}>
            <Box>
              <div className="brand-lockup">
                <div className="brand-mark">M</div>
                <div><Text color="brand.700" fontWeight="800" letterSpacing="wide">GROUPE LES MAJORANTS</Text><Text className="brand-tagline">DISCIPLINE · TRAVAIL · EXCELLENCE</Text></div>
              </div>
              <Heading size="lg" mt={8}>Bienvenue !</Heading><Text color="gray.600" mt={2}>Connectez-vous à votre espace de gestion.</Text>
            </Box>
            {offline && <Alert status="warning" borderRadius="md"><AlertIcon />La connexion au serveur local est nécessaire pour ouvrir une session.</Alert>}
            <form onSubmit={signIn}>
              <Stack spacing={4}>
                <FormControl isRequired><FormLabel>Nom d’utilisateur</FormLabel><Input autoComplete="username" value={login.username} onChange={(e) => setLogin({ ...login, username: e.target.value })} /></FormControl>
                <FormControl isRequired><FormLabel>Mot de passe</FormLabel><Input type="password" autoComplete="current-password" value={login.password} onChange={(e) => setLogin({ ...login, password: e.target.value })} /></FormControl>
                <Button type="submit" colorScheme="blue" isLoading={busy}>Se connecter</Button>
              </Stack>
            </form>
            <Text fontSize="sm" color="gray.500">Application hébergée sur le réseau local de l’établissement.</Text>
          </VStack>
        </CardBody>
      </Card>
    </Flex>
  );

  const selectedStudent = (id) => students.find((student) => student.id === id);
  return (
    <Box minH="100vh" className="app-shell">
      <Box className="topbar">
        <Flex className="topbar-inner" align="center" justify="space-between" gap={5}>
          <HStack className="topbar-brand" spacing={3}><div className="brand-mark brand-mark-small">M</div><Box><Text fontWeight="800">Les Majorants</Text></Box></HStack>
          <InputGroup className="global-search">
            <InputLeftElement pointerEvents="none"><Search size={17} /></InputLeftElement>
            <Input aria-label="Rechercher" placeholder="Rechercher dans l’établissement" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
          </InputGroup>
          <HStack className="topbar-actions" spacing={3}>
            <Button
              aria-label={mobileSearchOpen ? 'Fermer la recherche' : 'Ouvrir la recherche'}
              aria-expanded={mobileSearchOpen}
              title={mobileSearchOpen ? 'Fermer la recherche' : 'Rechercher'}
              className="mobile-search-toggle"
              onClick={() => setMobileSearchOpen((open) => !open)}
            >
              {mobileSearchOpen ? <X size={18} /> : <Search size={18} />}
            </Button>
            <Badge className={`connection-badge ${offline ? 'is-offline' : ''}`}>{offline ? <WifiOff size={14} /> : <Wifi size={14} />}{offline ? 'Hors ligne' : 'Connecté'}</Badge>
            <Avatar size="sm" name={auth.username} className="topbar-avatar" />
            <Button aria-label="Déconnexion" title="Déconnexion" className="logout-button" onClick={signOut}><LogOut size={17} /><Text className="logout-label">Déconnexion</Text></Button>
          </HStack>
        </Flex>
      </Box>
      <div className={`mobile-search-panel ${mobileSearchOpen ? 'is-open' : ''}`}>
        <InputGroup>
          <InputLeftElement pointerEvents="none"><Search size={16} /></InputLeftElement>
          <Input aria-label="Rechercher dans l’établissement" placeholder="Rechercher dans l’établissement" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
        </InputGroup>
      </div>
      <main className="facebook-layout">
        <aside className="left-sidebar">
          <button className="sidebar-profile" type="button">
            <Avatar size="sm" name={auth.username} className="sidebar-avatar" />
            <span><strong>{auth.username}</strong><small>{labels[auth.role]}</small></span>
          </button>
          <Divider my={3} />
          <Text className="sidebar-heading">MENU PRINCIPAL</Text>
          <nav className="sidebar-navigation" aria-label="Navigation principale">
            {navigationItems.map((item) => (
              <button key={item.label} type="button" className={`sidebar-link ${activeSection === item.section ? 'is-active' : ''}`} onClick={() => setActiveSection(item.section)}>
                <item.icon size={20} strokeWidth={activeSection === item.section ? 2.4 : 2} />
                <span>{item.label}</span>
                {activeSection === item.section && <ChevronRight size={16} className="sidebar-chevron" />}
              </button>
            ))}
          </nav>
          <Divider my={4} />
          <div className="sidebar-note">
            <div className="sidebar-note-icon"><BookOpen size={18} /></div>
            <Text fontWeight="700">Espace scolaire</Text>
            <Text fontSize="xs" color="gray.500">Gérez votre établissement depuis un seul endroit.</Text>
          </div>
          <Text className="sidebar-footer">Groupe Les Majorants · Gestion locale</Text>
        </aside>
        <section className="main-feed">
          <Flex className="page-heading" justify="space-between" align="center" gap={3}>
            <Box>
              <Text className="eyebrow">ESPACE DE GESTION</Text>
              <Heading size="lg">Bonjour, {auth.username}</Heading>
              <Text color="gray.600" fontSize="sm">{labels[auth.role]} · Retrouvez ici les informations de votre établissement.</Text>
            </Box>
            <Button onClick={loadData} isDisabled={offline} className="refresh-button"><RefreshCw size={16} /> Actualiser</Button>
          </Flex>
          {!window.isSecureContext && <Alert status="info" borderRadius="md" mb={4}><AlertIcon />En HTTP local, gardez cette page ouverte pendant une coupure. HTTPS sera nécessaire pour la relancer hors ligne après fermeture.</Alert>}
          {offline && <Alert status="warning" borderRadius="md" mb={4}><AlertIcon />Mode hors ligne : les saisies sont gardées sur cet appareil et seront synchronisées au retour du Wi‑Fi.</Alert>}
          <SimpleGrid columns={{ base: 1, sm: 3 }} spacing={3} mb={5}>
            <StatCard icon={GraduationCap} title="Élèves" value={stats.students} detail="Inscrits" color="blue" />
            <StatCard icon={Check} title="Présents aujourd’hui" value={stats.present} detail="Pointages enregistrés" color="green" />
            <StatCard icon={CircleDollarSign} title="Paiements à suivre" value={stats.unpaid} detail="Échéances en attente" color="orange" />
          </SimpleGrid>
          <Tabs index={activeSection} onChange={setActiveSection} colorScheme="blue" isLazy className="workspace-tabs">
            <TabList className="visually-hidden-tabs">
              <Tab>Élèves</Tab><Tab>Présences</Tab><Tab>Paiements</Tab>{canManageUsers && <Tab>Comptes</Tab>}
            </TabList>
            <TabPanels>
              <TabPanel px={0} pt={0}><StudentPanel students={visibleStudents} canManage={canManage} form={studentForm} setForm={setStudentForm} onSave={(event) => {
                event.preventDefault();
                if (!studentForm.name.trim() || !studentForm.schoolClass.trim()) return;
                saveRecord('/api/students', studentForm, setStudents);
                setStudentForm({ name: '', schoolClass: '', guardianName: '', phone: '' });
              }} /></TabPanel>
              <TabPanel px={0} pt={0}><AttendancePanel students={students} records={visibleAttendance} canTake={canTakeAttendance} form={attendanceForm} setForm={setAttendanceForm} onSave={(event) => {
                event.preventDefault(); const student = selectedStudent(attendanceForm.studentId); if (!student) return;
                saveRecord('/api/attendance', { ...attendanceForm, studentName: student.name, date: localDate() }, setAttendance);
                setAttendanceForm({ studentId: '', arrivalTime: '', departureTime: '', status: 'PRESENT' });
              }} /></TabPanel>
              <TabPanel px={0} pt={0}><PaymentPanel students={students} records={visiblePayments} canManage={canManage} form={paymentForm} setForm={setPaymentForm} onSave={(event) => {
                event.preventDefault(); const student = selectedStudent(paymentForm.studentId); if (!student) return;
                saveRecord('/api/payments', { ...paymentForm, amount: Number(paymentForm.amount), studentName: student.name, paymentDate: localDate() }, setPayments);
                setPaymentForm({ studentId: '', amount: '', dueDate: '', status: 'PAYE', note: '' });
              }} /></TabPanel>
              {canManageUsers && <TabPanel px={0} pt={0}><UsersPanel users={visibleUsers} students={students} form={userForm} setForm={setUserForm} onSave={async (event) => {
                event.preventDefault();
                try {
                  await api('/api/users', { method: 'POST', body: JSON.stringify({ ...userForm, studentId: userForm.studentId || null, schoolClass: userForm.schoolClass || null }) });
                  setUserForm({ username: '', password: '', role: 'ENSEIGNANT', schoolClass: '', studentId: '' });
                  await loadData(); toast({ title: 'Compte créé', status: 'success' });
                } catch (error) { toast({ title: 'Création impossible', description: error.message, status: 'error' }); }
              }} /></TabPanel>}
            </TabPanels>
          </Tabs>
          <Divider my={5} />
          <Text textAlign="center" color="gray.500" fontSize="xs">Groupe Les Majorants · Gestion scolaire locale</Text>
        </section>
        <aside className="right-sidebar">
          <Card className="side-card"><CardBody>
            <div className="side-card-heading"><CalendarDays size={17} /><Heading size="sm">Aujourd’hui</Heading></div>
            <Text className="current-date">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
            <Divider my={3} />
            <div className="schedule-row"><Clock3 size={17} /><span><strong>Étude du soir</strong><small>Lundi à vendredi · 17h–20h30</small></span></div>
            <div className="schedule-row"><BookOpen size={17} /><span><strong>Cours de répétition</strong><small>Samedi et dimanche · 14h–18h</small></span></div>
          </CardBody></Card>
          <Card className="side-card"><CardBody>
            <div className="side-card-heading"><Settings2 size={17} /><Heading size="sm">État du réseau</Heading></div>
            <div className="network-status"><span className={`network-indicator ${offline ? 'is-offline' : ''}`} /><span><strong>{offline ? 'Hors ligne' : 'Connecté au serveur'}</strong><small>{offline ? 'Les saisies seront synchronisées au retour du réseau.' : 'Les données sont à jour sur le réseau local.'}</small></span></div>
          </CardBody></Card>
          <Text className="right-footer">Discipline · Travail · Excellence</Text>
        </aside>
        <nav className="mobile-bottom-nav" aria-label="Navigation mobile" style={{ gridTemplateColumns: `repeat(${navigationItems.length}, minmax(0, 1fr))` }}>
          {navigationItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`mobile-bottom-link ${activeSection === item.section ? 'is-active' : ''}`}
              aria-current={activeSection === item.section ? 'page' : undefined}
              onClick={() => setActiveSection(item.section)}
            >
              <item.icon size={21} strokeWidth={activeSection === item.section ? 2.4 : 1.9} />
              <span>{item.label === 'Comptes utilisateurs' ? 'Comptes' : item.label}</span>
            </button>
          ))}
        </nav>
      </main>
    </Box>
  );
}

function StatCard({ icon, title, value, detail, color }) {
  const IconComponent = icon;
  return <Card className={`stat-card stat-${color}`}><CardBody>
    <Flex justify="space-between" align="start"><Box><Text className="stat-title">{title}</Text><Heading className="stat-value" size="xl" my={2}>{value}</Heading></Box><div className="stat-icon"><IconComponent size={21} strokeWidth={2.2} /></div></Flex>
    <Text className="stat-detail"><span className="detail-dot" />{detail}</Text>
  </CardBody></Card>;
}

function StudentPanel({ students, canManage, form, setForm, onSave }) {
  return <Stack spacing={5}>
    {canManage && <Card className="panel-card"><CardBody><div className="panel-heading"><span className="panel-icon icon-blue"><GraduationCap size={20} /></span><Box><Heading size="sm">Inscrire un élève</Heading><Text className="panel-subtitle">Ajoutez un élève à votre établissement</Text></Box></div><form onSubmit={onSave}><SimpleGrid columns={{ base: 1, md: 4 }} spacing={3}>
      <FormControl isRequired><FormLabel>Nom complet</FormLabel><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormControl>
      <FormControl isRequired><FormLabel>Classe</FormLabel><Input placeholder="Ex. 6e" value={form.schoolClass} onChange={(e) => setForm({ ...form, schoolClass: e.target.value })} /></FormControl>
      <FormControl><FormLabel>Parent / tuteur</FormLabel><Input value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} /></FormControl>
      <FormControl><FormLabel>Téléphone</FormLabel><Input inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></FormControl>
    </SimpleGrid><Button mt={4} type="submit" colorScheme="blue">Ajouter l’élève</Button></form></CardBody></Card>}
    <Card className="panel-card"><CardBody><div className="panel-heading"><span className="panel-icon icon-violet"><BookOpen size={20} /></span><Box><Heading size="sm">Liste des élèves</Heading><Text className="panel-subtitle">{students.length} élève(s) dans votre périmètre</Text></Box></div>
      {students.length ? <Stack spacing={2}>{students.map((student) => <Flex key={student.id} className="record-row" justify="space-between" align="center" p={3} borderRadius="md"><Box><Text fontWeight="semibold">{student.name}</Text><Text fontSize="sm" color="gray.600">{student.guardianName || 'Parent non renseigné'}{student.phone ? ` · ${student.phone}` : ''}</Text></Box><Badge colorScheme="blue">{student.schoolClass}</Badge></Flex>)}</Stack> : <div className="empty-state"><GraduationCap size={22} /><Text color="gray.500">Aucun élève enregistré pour le moment.</Text></div>}
    </CardBody></Card>
  </Stack>;
}

function AttendancePanel({ students, records, canTake, form, setForm, onSave }) {
  return <Stack spacing={5}>
    {canTake && <Card className="panel-card"><CardBody><div className="panel-heading"><span className="panel-icon icon-green"><Clock3 size={20} /></span><Box><Heading size="sm">Pointage de présence</Heading><Text className="panel-subtitle">Enregistrez l’arrivée et le départ des élèves</Text></Box></div><form onSubmit={onSave}><SimpleGrid columns={{ base: 1, md: 5 }} spacing={3}>
      <FormControl isRequired><FormLabel>Élève</FormLabel><Select placeholder="Choisir" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>{students.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.schoolClass}</option>)}</Select></FormControl>
      <FormControl><FormLabel>Arrivée</FormLabel><Input type="time" value={form.arrivalTime} onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })} /></FormControl>
      <FormControl><FormLabel>Départ</FormLabel><Input type="time" value={form.departureTime} onChange={(e) => setForm({ ...form, departureTime: e.target.value })} /></FormControl>
      <FormControl><FormLabel>Statut</FormLabel><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="PRESENT">Présent</option><option value="ABSENT">Absent</option><option value="RETARD">En retard</option></Select></FormControl>
      <Flex align="end"><Button w="full" type="submit" colorScheme="blue" isDisabled={!students.length}>Enregistrer</Button></Flex>
    </SimpleGrid></form></CardBody></Card>}
    <Card className="panel-card"><CardBody><div className="panel-heading"><span className="panel-icon icon-green"><Check size={20} /></span><Box><Heading size="sm">Historique des présences</Heading><Text className="panel-subtitle">Les derniers pointages de vos élèves</Text></Box></div>
      {records.length ? <Stack spacing={2}>{[...records].reverse().slice(0, 50).map((record) => <Flex key={record.id} className="record-row" justify="space-between" align="center" p={3} borderRadius="md"><Box><Text fontWeight="semibold">{record.studentName}</Text><Text fontSize="sm" color="gray.600">{record.date} · {record.arrivalTime || 'Arrivée non notée'}{record.departureTime ? ` – ${record.departureTime}` : ''}</Text></Box><Badge colorScheme={record.status === 'PRESENT' ? 'green' : 'orange'}>{record.status}</Badge></Flex>)}</Stack> : <div className="empty-state"><Clock3 size={22} /><Text color="gray.500">Aucune présence enregistrée.</Text></div>}
    </CardBody></Card>
  </Stack>;
}

function PaymentPanel({ students, records, canManage, form, setForm, onSave }) {
  return <Stack spacing={5}>
    {canManage && <Card className="panel-card"><CardBody><div className="panel-heading"><span className="panel-icon icon-orange"><CircleDollarSign size={20} /></span><Box><Heading size="sm">Nouveau paiement</Heading><Text className="panel-subtitle">Enregistrez un règlement ou une échéance</Text></Box></div><form onSubmit={onSave}><SimpleGrid columns={{ base: 1, md: 5 }} spacing={3}>
      <FormControl isRequired><FormLabel>Élève</FormLabel><Select placeholder="Choisir" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</Select></FormControl>
      <FormControl isRequired><FormLabel>Montant (FCFA)</FormLabel><Input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></FormControl>
      <FormControl><FormLabel>Échéance</FormLabel><Input type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></FormControl>
      <FormControl><FormLabel>État</FormLabel><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}><option value="PAYE">Payé</option><option value="EN_ATTENTE">En attente</option></Select></FormControl>
      <Flex align="end"><Button w="full" type="submit" colorScheme="blue" isDisabled={!students.length}>Enregistrer</Button></Flex>
    </SimpleGrid></form></CardBody></Card>}
    <Card className="panel-card"><CardBody><div className="panel-heading"><span className="panel-icon icon-orange"><CircleDollarSign size={20} /></span><Box><Heading size="sm">Suivi des paiements</Heading><Text className="panel-subtitle">Historique et état des règlements</Text></Box></div>
      {records.length ? <Stack spacing={2}>{[...records].reverse().slice(0, 50).map((record) => <Flex key={record.id} className="record-row" justify="space-between" align="center" p={3} borderRadius="md"><Box><Text fontWeight="semibold">{record.studentName}</Text><Text fontSize="sm" color="gray.600">{Number(record.amount).toLocaleString('fr-FR')} FCFA · {record.paymentDate || 'Échéance'}{record.dueDate ? ` · À régler avant le ${record.dueDate}` : ''}</Text></Box><Badge colorScheme={record.status === 'PAYE' ? 'green' : 'orange'}>{record.status === 'PAYE' ? 'Payé' : 'En attente'}</Badge></Flex>)}</Stack> : <div className="empty-state"><CircleDollarSign size={22} /><Text color="gray.500">Aucun paiement enregistré.</Text></div>}
    </CardBody></Card>
  </Stack>;
}

function UsersPanel({ users, students, form, setForm, onSave }) {
  return <Stack spacing={5}>
    <Card className="panel-card"><CardBody><div className="panel-heading"><span className="panel-icon icon-violet"><UsersRound size={20} /></span><Box><Heading size="sm">Créer un compte</Heading><Text className="panel-subtitle">Donnez accès à un membre de l’établissement</Text></Box></div><form onSubmit={onSave}><SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
      <FormControl isRequired><FormLabel>Nom d’utilisateur</FormLabel><Input autoComplete="off" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} /></FormControl>
      <FormControl isRequired><FormLabel>Mot de passe provisoire</FormLabel><Input type="password" autoComplete="new-password" minLength={10} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></FormControl>
      <FormControl isRequired><FormLabel>Rôle</FormLabel><Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value, studentId: '' })}>{roles.map((role) => <option key={role} value={role}>{labels[role]}</option>)}</Select></FormControl>
      {form.role === 'ENSEIGNANT' && <FormControl isRequired><FormLabel>Classe attribuée</FormLabel><Input placeholder="Ex. 6e" value={form.schoolClass} onChange={(e) => setForm({ ...form, schoolClass: e.target.value })} /></FormControl>}
      {['PARENT', 'ELEVE'].includes(form.role) && <FormControl isRequired><FormLabel>Élève lié au compte</FormLabel><Select placeholder="Choisir un élève" value={form.studentId} onChange={(e) => setForm({ ...form, studentId: e.target.value })}>{students.map((student) => <option key={student.id} value={student.id}>{student.name} — {student.schoolClass}</option>)}</Select></FormControl>}
    </SimpleGrid><Button mt={4} type="submit" colorScheme="blue">Créer le compte</Button></form></CardBody></Card>
    <Card className="panel-card"><CardBody><div className="panel-heading"><span className="panel-icon icon-violet"><UsersRound size={20} /></span><Box><Heading size="sm">Comptes utilisateurs</Heading><Text className="panel-subtitle">{users.length} compte(s) enregistré(s)</Text></Box></div>{users.length ? <Stack spacing={2}>{users.map((user) => <Flex key={user.username} className="record-row" justify="space-between" p={3}><Text fontWeight="medium">{user.username}</Text><Badge>{labels[user.role] || user.role}</Badge></Flex>)}</Stack> : <Text color="gray.500">Aucun compte affiché.</Text>}</CardBody></Card>
  </Stack>;
}

export default App;
