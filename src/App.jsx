import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Pizza,
  Clock,
  MapPin,
  Phone,
  MessageCircle,
  X,
  Sparkles,
  ArrowRight,
  Zap,
  PhoneCall,
  MessageSquare,
  Smartphone,
  ShieldCheck,
  Check,
  Send,
  Loader2,
  ChefHat,
  Lock,
  AlertCircle,
  ChevronDown,
  User,
  Utensils,
  UserCheck,
  Building2
} from 'lucide-react';
import { supabase } from './lib/supabase';
import ChatWidget from './ChatWidget';

const App = () => {
  // --- SUPABASE DATA ---
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState(null);
  const [menu, setMenu] = useState([]);
  const [error, setError] = useState(null);

  // --- UI STATE ---
  const [activeCategory, setActiveCategory] = useState('SE ALT');
  const [scrolled, setScrolled] = useState(false);
  const [isMenuExpanded, setIsMenuExpanded] = useState(false);

  // SMS Kundeklub state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gdprAccepted, setGdprAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Chat overlay state
  const [showChat, setShowChat] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef(null);

  // --- DATA FETCHING ---
  useEffect(() => {
    const loadData = async () => {
      const hostname = window.location.hostname;
      const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);

      let slug;
      if (hostname.includes('getmait.dk')) {
        slug = hostname.split('.getmait.dk')[0];
        if (slug === 'staging.landingpage') slug = 'napoli';
      } else if (hostname.includes('sslip.io')) {
        slug = hostname.split('.')[0];
      } else if (hostname.includes('localhost') || isIpAddress) {
        slug = 'napoli';
      } else {
        slug = hostname.split('.')[0];
      }

      try {
        if (!supabase) {
          setError('Manglende Supabase-konfiguration.');
          setLoading(false);
          return;
        }

        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('subdomain', slug)
          .single();

        if (storeError || !storeData) {
          setError('Kunne ikke finde pizzaria. Kontakt support@getmait.dk');
          setLoading(false);
          return;
        }

        setStore(storeData);

        const { data: menuData, error: menuError } = await supabase
          .from('menu')
          .select('*')
          .eq('store_id', storeData.id)
          .eq('tilgaengelig', true)
          .order('kategori', { ascending: true })
          .order('pris', { ascending: true });

        if (menuError) {
          console.error('Menu error:', menuError);
        }

        setMenu(menuData || []);
        setLoading(false);
      } catch (err) {
        console.error('Error loading data:', err);
        setError('Kunne ikke hente data. Prøv igen senere.');
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hent velkomstbesked fra n8n når overlay åbnes (samme flow som ChatWidget)
  useEffect(() => {
    const fetchWelcomeMessage = async () => {
      if (!showChat || !store || messages.length > 0 || isLoading) return;
      let sessionId = sessionStorage.getItem(`getmait_overlay_${store.id}`);
      if (!sessionId) {
        sessionId = `overlay_${store.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        sessionStorage.setItem(`getmait_overlay_${store.id}`, sessionId);
      }
      setIsLoading(true);
      try {
        const response = await fetch(N8N_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: '__INIT_CHAT__',
            store_id: store.id,
            store_name: store.name,
            source: 'web_overlay_init',
            sessionId,
            timestamp: new Date().toISOString()
          })
        });
        const data = await response.json();
        const welcome = sanitizeReply(
          data.reply || data.output || data.message,
          `Hej! Velkommen til ${store.name}! 😊 Hvad kan jeg hjælpe dig med i dag?`
        );
        setMessages([{ role: 'assistant', content: welcome }]);
      } catch (err) {
        setMessages([{ role: 'assistant', content: `Hej! Velkommen til ${store.name}! 😊 Hvad kan jeg hjælpe dig med i dag?` }]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchWelcomeMessage();
  }, [showChat, store, messages.length]);

  // Auto-scroll i chat overlay
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  // --- MENU LOGIK ---
  const categories = useMemo(() => [...new Set(menu.map(item => item.kategori))], [menu]);
  const categoryLabels = ['SE ALT', ...categories.map(c => c.toUpperCase())];

  const currentItems = useMemo(() => {
    if (activeCategory === 'SE ALT') return menu;
    return menu.filter(item => item.kategori.toUpperCase() === activeCategory);
  }, [activeCategory, menu]);

  const displayedItems = isMenuExpanded ? currentItems : currentItems.slice(0, 6);

  // --- ÅBNINGSTIDER HJÆLPER ---
  const formatOpeningHours = (hours) => {
    if (!hours) return null;
    const dayMap = {
      monday: 'Man', tuesday: 'Tir', wednesday: 'Ons',
      thursday: 'Tor', friday: 'Fre', saturday: 'Lør', sunday: 'Søn'
    };
    // Gruppér dage med samme tider
    const groups = [];
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    days.forEach(day => {
      if (!hours[day]) return;
      const timeStr = `${hours[day].open} - ${hours[day].close}`;
      const last = groups[groups.length - 1];
      if (last && last.time === timeStr) {
        last.days.push(dayMap[day]);
      } else {
        groups.push({ days: [dayMap[day]], time: timeStr });
      }
    });
    return groups.map(g => ({
      label: g.days.length > 1 ? `${g.days[0]} - ${g.days[g.days.length - 1]}` : g.days[0],
      time: g.time
    }));
  };

  // --- SMS KUNDEKLUB ---
  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!gdprAccepted) return;
    setIsSubmitting(true);
    try {
      // Webhook til n8n for SMS tilmelding
      await fetch('https://n8n.getmait.dk/webhook/sms-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          phone,
          store_id: store?.id,
          store_name: store?.name,
          gdpr: true
        })
      });
    } catch (err) {
      console.error('SMS signup error:', err);
    }
    setIsSubmitting(false);
    setIsSubscribed(true);
  };

  // --- CHAT OVERLAY ---
  const N8N_WEBHOOK = import.meta.env.VITE_N8N_CHAT_WEBHOOK;

  const sanitizeReply = (text, fallback) => {
    if (!text || typeof text !== 'string') return fallback;
    if (text.includes('={{') || text.includes('$json.') || text.includes('$node') || text.match(/^\{\{.*\}\}$/)) return fallback;
    return text;
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    const currentInput = input;
    setInput('');
    setIsLoading(true);
    try {
      const response = await fetch(N8N_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentInput,
          store_id: store?.id,
          store_name: store?.name,
          source: 'web_overlay',
          sessionId: sessionStorage.getItem(`getmait_overlay_${store?.id}`) || `overlay_${store?.id}_${Date.now()}`,
          timestamp: new Date().toISOString()
        })
      });
      const data = await response.json();
      const reply = sanitizeReply(
        data.reply || data.output || data.message,
        'Tak! Vi vender tilbage hurtigst muligt.'
      );
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Hov, der opstod en fejl. Prøv igen eller ring til os.` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // --- LOADING / ERROR ---
  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white font-sans">
      <div className="w-12 h-12 border-4 border-slate-100 border-t-orange-600 rounded-full animate-spin mb-4"></div>
      <div className="font-black uppercase text-slate-300 italic tracking-[0.2em] text-[10px]">Getmait Platform...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white font-sans text-center p-6">
      <AlertCircle size={64} className="text-orange-600 mb-4" />
      <h2 className="text-2xl font-black italic mb-2">Noget gik galt</h2>
      <p className="text-slate-500 mb-6">{error}</p>
      <button onClick={() => window.location.reload()} className="bg-orange-600 text-white px-8 py-3 rounded-full font-bold">Prøv igen</button>
    </div>
  );

  const brandColor = store?.primary_color || '#ea580c';
  const openingHoursFormatted = formatOpeningHours(store?.opening_hours);
  const firstPizza = menu.find(item => item.kategori?.toLowerCase() === 'pizza');

  // Tjek om butikken er åben baseret på åbningstider (dansk tid)
  // is_open = false er altid lukket (manuel override ved travlhed)
  // is_open = true → tjek mod opening_hours
  const isOpen = (() => {
    if (!store.is_open) return false;
    if (!store.opening_hours) return true;
    // Pålidelig metode: konverter til dansk tid via toLocaleString
    const now = new Date();
    const copenhagenNow = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Copenhagen' }));
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const day = days[copenhagenNow.getDay()];
    const current = copenhagenNow.getHours() * 60 + copenhagenNow.getMinutes();
    const todayHours = store.opening_hours[day];
    if (!todayHours) return false;
    const [openH, openM] = todayHours.open.split(':').map(Number);
    const [closeH, closeM] = todayHours.close.split(':').map(Number);
    return current >= openH * 60 + openM && current < closeH * 60 + closeM;
  })();

  return (
    <div className="min-h-screen bg-[#FDFDFD] font-sans text-slate-900 selection:bg-orange-100 text-left">

      {/* NAVIGATION */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 px-6 py-6 ${scrolled ? 'bg-white/90 backdrop-blur-md border-b border-slate-100 py-4' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div
            className="flex items-center gap-2 font-black text-2xl tracking-tighter italic text-slate-900 uppercase cursor-pointer"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <Pizza style={{ color: brandColor }} size={28} strokeWidth={3} />
            {store.name}
          </div>
          <div className="flex items-center gap-8">
            <div className="hidden md:flex items-center gap-12">
              <button onClick={() => scrollToId('menu')} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-orange-600 transition-colors italic">Menukort</button>
              <button onClick={() => scrollToId('kundeklub')} className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-orange-600 transition-colors italic">Kundeklub</button>
            </div>
            <button onClick={() => scrollToId('menu')} className="bg-slate-900 text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-xl active:scale-95 transition-transform">Bestil nu</button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-24 pb-12 md:pt-48 md:pb-24 px-6 max-w-6xl mx-auto grid md:grid-cols-2 gap-8 md:gap-12 items-center text-left">
        <div className="space-y-6 md:space-y-8 text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.15em] italic">
            <Zap size={10} className="fill-orange-500 text-orange-500" /> Ingen telefonkø hos {store.name}
          </div>
          <h1 className="text-[54px] sm:text-[72px] md:text-[100px] lg:text-[120px] font-black leading-[0.82] uppercase italic tracking-tighter text-slate-900">
            Din Pizza. <br />
            <span className="underline decoration-[6px] underline-offset-[8px] md:decoration-[12px] md:underline-offset-[14px]" style={{ color: brandColor }}>Din Mait.</span>
          </h1>
          <p className="text-slate-500 text-base md:text-xl max-w-sm font-medium italic leading-relaxed pt-2 md:pt-4">
            Smagen af {store.name}, nu med hurtigere bestilling. Ring direkte til din Mait, eller start en chat på få sekunder.
          </p>
          <div className="flex flex-col gap-4 pt-4 max-w-sm">
            <a
              href={`tel:${store.phone_number || store.contact_phone}`}
              className="text-white px-10 py-5 rounded-[24px] font-black uppercase italic tracking-widest flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(234,88,12,0.3)] text-base transition-transform hover:scale-[1.02]"
              style={{ backgroundColor: brandColor }}
            >
              <PhoneCall size={20} /> Ring til din Mait
            </a>
            <button
              onClick={() => setShowChat(true)}
              className="bg-white border-2 border-slate-100 text-slate-800 px-10 py-5 rounded-[24px] font-black uppercase italic tracking-widest flex items-center justify-center gap-3 text-base shadow-sm hover:bg-slate-50 transition-all"
            >
              <MessageSquare size={20} /> Chat din bestilling
            </button>
          </div>
        </div>

        {/* Hero billede */}
        <div className="relative group w-full max-w-[500px] mx-auto">
          <div className="rounded-[80px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] rotate-3 border-[16px] border-white bg-slate-50 aspect-square transition-all duration-700 ease-out group-hover:scale-105 group-hover:rotate-1 group-hover:shadow-[0_60px_120px_-30px_rgba(0,0,0,0.2)] cursor-pointer relative">
            <img
              src={store.cover_image_url || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=1000'}
              className="w-full h-full object-cover scale-110 transition-transform duration-1000 group-hover:scale-100"
              alt={store.name}
            />
          </div>
          <div className="absolute -bottom-4 left-2 md:-left-8 bg-white/95 backdrop-blur-md p-4 md:p-6 rounded-[28px] md:rounded-[35px] flex items-center gap-3 md:gap-5 shadow-2xl border border-slate-50 z-10">
            <div className={`h-5 w-5 md:h-6 md:w-6 rounded-full flex items-center justify-center text-white ${isOpen ? 'bg-green-500 animate-pulse shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`}>
              <Pizza size={10} />
            </div>
            <div>
              <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 italic mb-0.5 leading-none">{isOpen ? 'Ovnene er varme' : 'Vi holder lukket'}</p>
              <p className={`font-black tracking-tight italic uppercase text-base md:text-lg leading-none ${isOpen ? 'text-slate-800' : 'text-red-500'}`}>
                {isOpen ? `${store.waiting_time || 20} min ventetid` : 'Lukket'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* MENU */}
      <section id="menu" className="bg-white py-16 md:py-32 px-6 rounded-t-[60px] md:rounded-t-[80px] shadow-[0_-30px_60px_rgba(0,0,0,0.02)] -mt-12">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 md:mb-12">
            <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase mb-2">Menukortet</h2>
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">
              Håndplukket menu fra {store.name} i {store.city || 'Danmark'}.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 mb-12">
            {categoryLabels.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setIsMenuExpanded(false); }}
                className={`px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.2em] italic transition-all border ${activeCategory === cat ? 'text-white border-transparent shadow-xl' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`}
                style={activeCategory === cat ? { backgroundColor: brandColor } : {}}
              >
                {cat}
              </button>
            ))}
          </div>

          {displayedItems.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-slate-400 italic">Ingen menupunkter tilgængelige i denne kategori.</p>
            </div>
          ) : (
            <>
              <div className="grid md:grid-cols-2 gap-8">
                {displayedItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="p-5 md:p-10 rounded-[32px] md:rounded-[48px] border border-slate-100 flex justify-between items-center bg-[#FAFAFA]/50 hover:bg-white hover:shadow-2xl hover:border-orange-200 transition-all group cursor-pointer"
                  >
                    <div className="space-y-1 max-w-[68%]">
                      <div className="flex items-baseline gap-1.5 md:gap-2 mb-1">
                        <span className="text-[15px] md:text-[20px] font-black italic shrink-0" style={{ color: brandColor }}>
                          {String(index + 1).padStart(2, '0')}.
                        </span>
                        <h3 className="font-black text-[17px] md:text-[22px] italic text-slate-800 uppercase leading-tight md:leading-none">{item.navn}</h3>
                      </div>
                      <p className="text-slate-400 text-xs md:text-sm italic font-medium">{item.beskrivelse}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[20px] md:text-[28px] font-black italic whitespace-nowrap" style={{ color: brandColor }}>{item.pris} kr.</span>
                    </div>
                  </div>
                ))}
              </div>

              {currentItems.length > 6 && (
                <div className="mt-16 flex justify-center">
                  <button onClick={() => setIsMenuExpanded(!isMenuExpanded)} className="flex flex-col items-center gap-3 group transition-all">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 group-hover:text-orange-600 italic">
                      {isMenuExpanded ? 'Vis mindre' : 'Se hele menukortet'}
                    </span>
                    <div className={`h-14 w-14 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-300 group-hover:border-orange-600 group-hover:text-orange-600 transition-all shadow-sm ${isMenuExpanded ? 'rotate-180' : ''}`}>
                      <ChevronDown size={28} />
                    </div>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {/* MODERNE SERVICE */}
      <section className="py-16 md:py-32 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-20 items-center">
          <div className="space-y-5 md:space-y-6">
            <div className="font-black text-xs uppercase tracking-[0.3em] italic" style={{ color: brandColor }}>Moderne Service</div>
            <h2 className="text-[36px] md:text-6xl lg:text-7xl font-black italic tracking-tighter leading-[0.9] uppercase text-slate-900">
              Spørg din Mait <br /> hos {store.name}
            </h2>
            <p className="text-slate-500 text-xl font-medium italic leading-relaxed max-w-md pt-4">
              Bestil hurtigt og nemt — ingen telefonkø, ingen ventetid på svar. Din Mait er klar med det samme, døgnet rundt.
            </p>
            <div className="flex items-center gap-4 pt-4">
              <div className="h-12 w-12 rounded-full bg-white shadow-md flex items-center justify-center" style={{ color: brandColor }}>
                <Zap size={20} fill="currentColor" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 italic">Intelligent digital ekspedition</p>
            </div>
          </div>

          <div className="bg-[#0B0F19] p-8 md:p-16 rounded-[40px] md:rounded-[65px] text-white relative overflow-hidden shadow-2xl group">
            <div className="relative z-10">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center mb-7 md:mb-10 shadow-lg rotate-3 group-hover:rotate-0 transition-transform" style={{ backgroundColor: brandColor }}>
                <MessageCircle size={24} className="fill-white" />
              </div>
              <blockquote className="text-xl md:text-[30px] font-black italic mb-7 md:mb-10 tracking-tight leading-[1.2]">
                "Hej Mait, jeg vil gerne have en Roma klar til kl. 18.00 og en Fanta – tak!"
              </blockquote>
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 italic">
                  Getmait: Noteret, vi ses kl. 18.00!
                </p>
              </div>
            </div>
            <span className="absolute -bottom-10 -right-10 text-[200px] font-black italic text-white/[0.03] pointer-events-none uppercase select-none leading-none">MAIT</span>
          </div>
        </div>
      </section>

      {/* SMS KUNDEKLUB */}
      <section id="kundeklub" className="py-16 md:py-32 px-6 bg-white overflow-hidden border-t border-slate-50">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-10 md:gap-16">

          {/* VENSTRE SIDE */}
          <div className="lg:w-1/2 space-y-8 text-left text-slate-900">
            <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-orange-50 border border-orange-100" style={{ color: brandColor }}>
              <Smartphone size={16} />
              <span className="text-[10px] font-black uppercase tracking-widest italic leading-none">
                Bliv en del af {store.name}-familien
              </span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-7xl font-black italic uppercase tracking-tighter leading-[0.9] text-slate-900">
              Få tilbud via <br />
              <span style={{ color: brandColor }}>Kundeklubben.</span>
            </h2>
            <p className="text-slate-500 text-xl font-medium italic leading-relaxed max-w-md">
              Tilmeld dig vores eksklusive fordelsklub og modtag hemmelige tilbud, før alle andre.
              Det er gratis, og vi sender kun det bedste.
            </p>
          </div>

          {/* HØJRE SIDE */}
          <div className="lg:w-1/2 w-full">
            {isSubscribed ? (
              <div className="p-12 rounded-[50px] text-white text-center shadow-2xl" style={{ backgroundColor: brandColor }}>
                <div className="bg-white/20 w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Check size={40} strokeWidth={4} />
                </div>
                <h3 className="text-3xl font-black italic uppercase mb-2">Velkommen i klubben!</h3>
                <p className="text-orange-100 font-medium italic">Du har nu modtaget en bekræftelses-SMS.</p>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="bg-[#FAFAFA] p-7 md:p-14 rounded-[60px] border border-slate-100 shadow-xl space-y-6 relative overflow-hidden">

                {/* NAVN */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic block">Dit Navn</label>
                  <div className="relative">
                    <input
                      required
                      type="text"
                      placeholder="F.eks. Anders Andersen"
                      className="w-full bg-white border-2 border-slate-100 rounded-[24px] py-5 px-8 pl-14 text-lg font-bold outline-none transition-all placeholder:text-slate-200 shadow-inner italic"
                      onFocus={e => e.target.style.borderColor = brandColor}
                      onBlur={e => e.target.style.borderColor = ''}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                  </div>
                </div>

                {/* TELEFON */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1 italic block">Dit Telefonnummer</label>
                  <div className="relative">
                    <input
                      required
                      type="tel"
                      placeholder="+45 00 00 00 00"
                      className="w-full bg-white border-2 border-slate-100 rounded-[24px] py-5 px-8 pl-14 text-lg font-bold outline-none transition-all placeholder:text-slate-200 shadow-inner italic"
                      onFocus={e => e.target.style.borderColor = brandColor}
                      onBlur={e => e.target.style.borderColor = ''}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                    <Phone size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" />
                  </div>
                </div>

                {/* GDPR */}
                <label className="flex items-start gap-4 cursor-pointer group">
                  <div className="relative mt-1 shrink-0">
                    <input type="checkbox" required className="peer sr-only" checked={gdprAccepted} onChange={() => setGdprAccepted(!gdprAccepted)} />
                    <div className="w-6 h-6 border-2 border-slate-200 rounded-lg bg-white peer-checked:bg-orange-600 peer-checked:border-orange-600 transition-all shadow-sm" style={gdprAccepted ? { backgroundColor: brandColor, borderColor: brandColor } : {}}></div>
                    {gdprAccepted && <Check className="absolute inset-0 text-white w-6 h-6 p-1" strokeWidth={4} />}
                  </div>
                  <div className="flex-1 text-xs font-medium italic text-slate-400 leading-relaxed group-hover:text-slate-600 transition-colors">
                    Jeg giver samtykke til, at {store.name} må sende mig SMS-marketing. Jeg kan til enhver tid afmelde mig. Læs vores <span className="underline">Privatlivspolitik</span>.
                  </div>
                </label>

                {/* KNAP */}
                <button
                  disabled={!gdprAccepted || isSubmitting}
                  type="submit"
                  className="w-full text-white py-6 rounded-[24px] font-black uppercase italic tracking-widest text-lg shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-30 disabled:grayscale"
                  style={{ backgroundColor: brandColor }}
                >
                  {isSubmitting ? <Zap className="animate-spin" size={24} /> : <>Tilmeld mig nu <ArrowRight size={24} /></>}
                </button>

                <div className="flex items-center justify-center gap-3 opacity-30 pt-2">
                  <ShieldCheck size={14} />
                  <span className="text-[10px] font-black uppercase tracking-widest italic">100% GDPR Sikret</span>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#0B0F19] pt-12 md:pt-24 pb-12 px-6 text-white border-t border-white/5">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-16">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Pizza style={{ color: brandColor }} size={32} />
              <div className="font-black text-2xl tracking-tighter italic uppercase leading-none">{store.name}</div>
            </div>
            <p className="text-white/60 text-sm font-medium italic leading-relaxed max-w-xs">
              Traditionelt håndværk kombineret med personlig digital service.
              {store.city && ` Autentisk smag fra ${store.city}.`}
            </p>
            {store.smiley_url && (
              <a href={store.smiley_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-slate-500 text-[9px] font-black uppercase tracking-widest hover:text-orange-600 transition-colors italic">
                <ShieldCheck size={12} /> Se kontrolrapport
              </a>
            )}
          </div>

          <div className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.25em] italic leading-none" style={{ color: brandColor }}>Åbningstider</h4>
            <div className="space-y-3 text-sm font-bold italic text-slate-400">
              {openingHoursFormatted ? openingHoursFormatted.map((row, i) => (
                <div key={i} className="flex justify-between border-b border-white/5 pb-2">
                  <span>{row.label}:</span>
                  <span className="text-white">{row.time}</span>
                </div>
              )) : (
                <p className="text-slate-600 italic text-xs">Kontakt os for åbningstider.</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-[11px] font-black uppercase tracking-[0.25em] italic leading-none" style={{ color: brandColor }}>Kontakt</h4>
            <div className="space-y-4 text-sm font-bold italic text-white">
              {store.address && (
                <div className="flex items-start gap-3">
                  <MapPin size={18} style={{ color: brandColor }} className="shrink-0 mt-0.5" />
                  <span>{store.address}</span>
                </div>
              )}
              {store.contact_phone && (
                <div className="flex items-start gap-3">
                  <UserCheck size={18} style={{ color: brandColor }} className="shrink-0 mt-0.5" />
                  <div>
                    <a href={`tel:${store.contact_phone}`} className="hover:text-orange-400 transition-colors block leading-tight">
                      {store.contact_phone}
                    </a>
                    <span className="text-[10px] font-normal not-italic text-white/35 uppercase tracking-widest">Personlig betjening</span>
                  </div>
                </div>
              )}
              {store.cvr_number && (
                <div className="flex items-start gap-3">
                  <Building2 size={18} style={{ color: brandColor }} className="shrink-0 mt-0.5" />
                  <div>
                    <span className="block leading-tight">{store.cvr_number}</span>
                    <span className="text-[10px] font-normal not-italic text-white/35 uppercase tracking-widest">CVR-nr.</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto mt-20 pt-10 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-white/20 text-[10px] font-bold uppercase italic tracking-widest">
          <span>Powered by GetMait • © 2026 {store.name}</span>
          <button onClick={() => setShowTerms(true)} className="hover:text-white/50 transition-colors underline underline-offset-2">
            Handelsbetingelser
          </button>
        </div>
      </footer>

      {/* CHAT WIDGET - UÆNDRET */}
      <ChatWidget />

      {/* CHAT OVERLAY — åbnes via "Chat din bestilling" */}
      {showChat && (
        <div className="fixed inset-0 z-[200] chat-overlay-in">

          {/* ── MOBIL: ChatWidget-stil (fuld skærm) ── */}
          <div className="md:hidden flex flex-col h-dvh bg-white">

            {/* HEADER */}
            <div style={{ backgroundColor: brandColor }} className="p-6 text-white flex justify-between items-center relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12 scale-150 pointer-events-none">
                <Utensils size={100} />
              </div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="bg-white p-3.5 rounded-2xl shadow-2xl">
                  <Sparkles size={24} className="text-orange-500" />
                </div>
                <div>
                  <h3 className="font-black text-2xl leading-none tracking-tighter uppercase italic">{store.name}</h3>
                  {store.city && <p className="text-xs opacity-75 mt-0.5">{store.city}</p>}
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full ${isOpen ? 'bg-green-400 animate-pulse shadow-[0_0_12px_rgba(74,222,128,1)]' : 'bg-red-500'}`}></span>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-90">{isOpen ? 'Din personlige Mait' : 'Vi holder lukket'}</p>
                  </div>
                </div>
              </div>
              <button onClick={() => setShowChat(false)} className="hover:bg-white/20 p-2 rounded-full transition-all relative z-10">
                <X size={24} />
              </button>
            </div>

            {/* KONTAKT BAR */}
            <div className="bg-slate-50 px-6 py-4 flex justify-around border-b border-slate-100 shadow-inner shrink-0">
              <a href={`tel:${store.phone_number || store.contact_phone}`} className="flex flex-col items-center gap-1.5 group">
                <div className="bg-white p-3 rounded-xl shadow-sm group-hover:bg-green-50 group-active:scale-90 transition-all">
                  <Phone size={18} className="text-slate-400 group-hover:text-green-600" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ring</span>
              </a>
              <a href={`sms:${store.phone_number || store.contact_phone}`} className="flex flex-col items-center gap-1.5 group">
                <div className="bg-white p-3 rounded-xl shadow-sm group-hover:bg-blue-50 group-active:scale-90 transition-all">
                  <MessageCircle size={18} className="text-slate-400 group-hover:text-blue-600" />
                </div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SMS</span>
              </a>
              <div className="flex flex-col items-center gap-1.5">
                <div className="bg-red-50 p-3 rounded-xl shadow-sm border border-red-100 animate-pulse">
                  <Sparkles size={18} className="text-red-600" />
                </div>
                <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Chat-ordre</span>
              </div>
            </div>

            {/* BESKEDER */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-4 bg-slate-50/20">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-4 rounded-[2rem] text-[15px] leading-relaxed shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-slate-800 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-100 rounded-tl-none font-medium'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-slate-100 rounded-tl-none flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                    <span className="text-xs text-slate-400 font-bold italic">Maiten tænker...</span>
                  </div>
                </div>
              )}
            </div>

            {/* INPUT */}
            <div className="p-5 bg-white border-t border-slate-100 shrink-0">
              <form onSubmit={handleSendMessage} className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Hvad skal vi sætte i ovnen, Mait?"
                  className="flex-1 bg-slate-100 border-none rounded-2xl px-5 py-4 text-base focus:ring-2 outline-none font-medium placeholder:text-slate-400 shadow-inner"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  style={{ backgroundColor: brandColor }}
                  className="p-4 text-white rounded-2xl hover:opacity-90 disabled:opacity-30 transition-all shadow-2xl active:scale-95 flex items-center justify-center min-w-[56px]"
                >
                  <Send size={22} />
                </button>
              </form>
              <div className="flex items-center justify-center gap-1.5 mt-4">
                <p className="text-[10px] text-slate-300 font-black tracking-[0.3em] uppercase">Powered by GetMait</p>
                <Sparkles size={10} className="text-orange-300" />
              </div>
            </div>
          </div>

          {/* ── DESKTOP: sidebar-overlay ── */}
          <div className="hidden md:flex h-full bg-slate-900/95 backdrop-blur-2xl items-center justify-center p-6">
            <div className="bg-[#FDFCFB] w-full max-w-5xl h-[850px] rounded-[4.5rem] shadow-[0_80px_160px_-40px_rgba(0,0,0,0.6)] flex flex-row overflow-hidden border border-white/20 chat-panel-in">

              {/* SIDEBAR */}
              <div className="w-1/3 bg-[#0F172A] p-12 text-white relative overflow-hidden flex flex-col justify-between shrink-0 border-r border-white/5">
                <div className="relative z-10">
                  <div className="w-24 h-24 rounded-[3rem] flex items-center justify-center mb-12 shadow-2xl transform hover:rotate-6 transition-transform" style={{ backgroundColor: brandColor }}>
                    <ChefHat size={48} className="text-white" />
                  </div>
                  <h3 className="text-5xl font-black italic uppercase tracking-tighter leading-[0.95] mb-8">Mait Kitchen Lounge.</h3>
                  <div className="space-y-10">
                    <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/10 hover:bg-white/10 transition-colors">
                      <div className="flex items-center gap-3 mb-2">
                        <Sparkles size={16} style={{ color: brandColor }} />
                        <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: brandColor }}>Dagens anbefaling</span>
                      </div>
                      <p className="text-sm font-bold italic text-slate-300 leading-relaxed">
                        {firstPizza ? `Prøv vores ${firstPizza.navn} – ${firstPizza.beskrivelse}` : `Spørg om dagens speciale fra ${store.name}!`}
                      </p>
                    </div>
                    <div className="pt-8 border-t border-white/10 space-y-6">
                      <div className="flex items-center gap-5">
                        <div className={`h-3 w-3 rounded-full ${isOpen ? 'bg-green-500 animate-pulse shadow-[0_0_15px_#22c55e]' : 'bg-red-500'}`}></div>
                        <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-400 italic">{isOpen ? 'Køkkenet er Online' : 'Vi holder lukket'}</span>
                      </div>
                      <div className="flex items-center gap-5">
                        <Clock size={20} style={{ color: brandColor }} />
                        <span className="text-sm font-bold italic text-slate-300 uppercase tracking-widest">{isOpen ? `${store.waiting_time || 20} min. ventetid` : 'Lukket'}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <Pizza className="absolute -bottom-20 -left-20 opacity-5 w-[450px] h-[450px] rotate-12 pointer-events-none" style={{ color: brandColor }} />
              </div>

              {/* CHAT OMRÅDE */}
              <div className="flex-1 flex flex-col bg-[#FDFCFB]">
                <header className="p-10 border-b border-slate-100 flex justify-between items-center bg-white/40 backdrop-blur-md sticky top-0 z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full shadow-[0_0_15px_#f97316]" style={{ backgroundColor: brandColor }}></div>
                    <span className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 italic leading-none">Personlig Concierge</span>
                  </div>
                  <button onClick={() => setShowChat(false)} className="p-4 bg-slate-100 rounded-3xl hover:bg-red-50 hover:text-red-600 transition-all text-slate-400 active:scale-90 shadow-sm border border-slate-200/50">
                    <X size={24} />
                  </button>
                </header>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-12 space-y-8 custom-scrollbar bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]">
                  {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-8 rounded-[3.5rem] text-xl font-bold italic leading-relaxed shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] border ${
                        msg.role === 'user'
                          ? 'bg-[#0F172A] text-white rounded-tr-none border-[#0F172A]'
                          : 'bg-white text-slate-800 border-slate-100 rounded-tl-none'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-5 bg-white p-7 rounded-[2.5rem] border border-slate-100 shadow-xl">
                        <Loader2 className="animate-spin" size={28} style={{ color: brandColor }} />
                        <span className="text-sm font-black uppercase tracking-[0.3em] text-slate-300 italic leading-none">Mait forbereder svaret...</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-10 bg-white border-t border-slate-100 shrink-0">
                  <form onSubmit={handleSendMessage} className="flex gap-4 mb-6 max-w-4xl mx-auto">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Hvad kan jeg sætte i gang for dig?"
                      className="flex-1 bg-[#F9FAFB] border-2 border-slate-200 rounded-[3rem] px-8 py-6 text-xl focus:bg-white outline-none font-bold placeholder:text-slate-200 shadow-inner italic transition-all"
                      onFocus={e => e.target.style.borderColor = brandColor}
                      onBlur={e => e.target.style.borderColor = '#e2e8f0'}
                      disabled={isLoading}
                    />
                    <button type="submit" disabled={isLoading || !input.trim()} className="p-6 rounded-[3rem] text-white shadow-[0_25px_50px_-12px_rgba(234,88,12,0.4)] hover:opacity-90 hover:scale-105 transition-all active:scale-90 flex items-center justify-center disabled:opacity-30 shrink-0" style={{ backgroundColor: brandColor }}>
                      <Send size={36} />
                    </button>
                  </form>
                  <div className="flex justify-center gap-8 opacity-30">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase italic tracking-[0.3em] text-slate-400"><Lock size={12} /> Krypteret</div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase italic tracking-[0.3em] text-slate-400"><Zap size={12} /> Hurtig AI</div>
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase italic tracking-[0.3em] text-slate-400"><ChefHat size={12} /> Køkken-klar</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* HANDELSBETINGELSER MODAL */}
      {showTerms && (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6" onClick={() => setShowTerms(false)}>
          <div
            className="bg-white w-full sm:max-w-2xl max-h-[90vh] sm:rounded-[2.5rem] rounded-t-[2.5rem] overflow-y-auto shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 px-8 py-6 flex justify-between items-center rounded-t-[2.5rem] z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.25em] italic mb-1" style={{ color: brandColor }}>Juridisk</p>
                <h2 className="text-2xl font-black italic uppercase tracking-tight text-slate-900">Handelsbetingelser</h2>
              </div>
              <button onClick={() => setShowTerms(false)} className="p-3 bg-slate-100 rounded-2xl hover:bg-red-50 hover:text-red-600 transition-all text-slate-400">
                <X size={20} />
              </button>
            </div>

            {/* Indhold */}
            <div className="px-8 py-8 space-y-8 text-slate-600 text-sm leading-relaxed">

              {/* Virksomhedsoplysninger */}
              <section className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] italic text-slate-900">1. Virksomhedsoplysninger</h3>
                <div className="bg-slate-50 rounded-2xl p-5 space-y-1 font-medium">
                  <p className="font-black text-slate-900">{store.name}</p>
                  {store.address && <p>{store.address}</p>}
                  {store.city && <p>{store.city}</p>}
                  {store.cvr_number && <p>CVR-nr.: {store.cvr_number}</p>}
                  {store.contact_phone && (
                    <p>Tlf.: <a href={`tel:${store.contact_phone}`} className="underline" style={{ color: brandColor }}>{store.contact_phone}</a></p>
                  )}
                </div>
              </section>

              {/* Bestilling */}
              <section className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] italic text-slate-900">2. Bestilling</h3>
                <p>Bestilling hos {store.name} kan foretages via vores hjemmeside, telefon eller chat. En bestilling er bindende, når du har modtaget en bekræftelse. Vi forbeholder os ret til at afvise bestillinger ved udsolgte varer eller ved force majeure.</p>
              </section>

              {/* Priser og betaling */}
              <section className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] italic text-slate-900">3. Priser og betaling</h3>
                <p>Alle priser er angivet i danske kroner (DKK) inkl. moms. {store.name} forbeholder sig ret til at ændre priser uden forudgående varsel. Betaling sker ved afhentning eller levering med de betalingsmidler, vi accepterer.</p>
              </section>

              {/* Afhentning og levering */}
              <section className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] italic text-slate-900">4. Afhentning og levering</h3>
                <p>Forventet ventetid er ca. {store.waiting_time || 20} minutter fra bestillingstidspunktet. Ventetiden er vejledende og kan variere afhængigt af efterspørgsel. {store.name} er ikke ansvarlig for forsinkelser som følge af forhold uden for vores kontrol.</p>
              </section>

              {/* Fortrydelsesret */}
              <section className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] italic text-slate-900">5. Fortrydelsesret</h3>
                <p>I henhold til forbrugeraftaleloven § 18, stk. 2, nr. 4, gælder der <strong>ingen fortrydelsesret</strong> for levering af fødevarer og andre varer, der forringes hurtigt. Bestilling af mad og drikkevarer hos {store.name} er derfor bindende.</p>
              </section>

              {/* Reklamation */}
              <section className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] italic text-slate-900">6. Reklamation</h3>
                <p>Har du oplevet fejl eller mangler ved din ordre, bedes du kontakte os hurtigst muligt — gerne samme dag. Vi behandler alle reklamationer individuelt og bestræber os på at finde en tilfredsstillende løsning.</p>
                {store.contact_phone && (
                  <p>Kontakt os på <a href={`tel:${store.contact_phone}`} className="underline font-bold" style={{ color: brandColor }}>{store.contact_phone}</a>.</p>
                )}
              </section>

              {/* Persondata */}
              <section className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] italic text-slate-900">7. Persondata og GDPR</h3>
                <p>{store.name} behandler dine personoplysninger i overensstemmelse med gældende databeskyttelseslovgivning (GDPR). Oplysninger indsamlet i forbindelse med din bestilling bruges udelukkende til at behandle og levere din ordre samt til at kontakte dig ved behov.</p>
                <p>Ved tilmelding til Kundeklubben giver du samtykke til modtagelse af markedsføring. Du kan til enhver tid afmelde dig.</p>
              </section>

              {/* Tvister */}
              <section className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] italic text-slate-900">8. Tvister og lovvalg</h3>
                <p>Disse handelsbetingelser er underlagt dansk ret. Opstår der en tvist, som ikke kan løses i mindelighed, kan sagen indbringes for de ordinære danske domstole.</p>
              </section>

              <p className="text-xs text-slate-400 italic pt-4 border-t border-slate-100">
                Senest opdateret: {new Date().getFullYear()} • {store.name}
              </p>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
        @keyframes bounce-slow { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
        .animate-bounce-slow { animation: bounce-slow 4s infinite ease-in-out; }
        @keyframes chat-overlay-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes chat-panel-slide { from { opacity: 0; transform: translateY(40px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .chat-overlay-in { animation: chat-overlay-fade 0.4s ease-out; }
        .chat-panel-in { animation: chat-panel-slide 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
};

export default App;
