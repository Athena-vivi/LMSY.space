// Brazilian Portuguese UI strings. SEO-first: uses the terms Brazilian GL
// fans actually search (Galeria, Crônica, Lives, fan meetings, prêmios,
// semanas de moda, bastidores...). Names (LMSY, Lookmhee, Sonya, Besties)
// are never translated. Must cover every key in ./en.
import type { TranslationKey } from './en.ts';

export const pt: Record<TranslationKey, string> = {
    // Navigation
    'nav.home': 'Início',
    'nav.chronicle': 'Crônica',
    'nav.exhibitions': 'Exposições',
    'nav.editorial': 'Editorial',
    'nav.resonance': 'Ressonância',
    'nav.duality': 'Dualidade',
    'nav.profiles': 'Perfis',
    'nav.gallery': 'Galeria',
    'nav.projects': 'Projetos',
    'nav.copyright': 'Copyright',
    'nav.about': 'Sobre',
    'nav.schedule': 'Agenda',
    'nav.toggleTheme': 'Alternar tema',
    'nav.toggleMenu': 'Abrir menu',
    'nav.viewAll': 'Ver tudo',
    'nav.lmsy': 'LMSY',
    'nav.lookmhee': 'Lookmhee',
    'nav.sonya': 'Sonya',

    // Hero
    'hero.lmsy': 'LMSY',
    'hero.subtitle': 'Lookmhee & Sonya',
    'hero.scroll': 'DESLIZE',
    'hero.lookmhee': 'LOOKMHEE',
    'hero.sonya': 'SONYA',
    'hero.besties': 'Um espaço dedicado à LMSY e às suas Besties.',

    // Quote
    'quote.text': '"Alguns sentimentos são impossíveis de esconder, por mais que você tente..."',
    'quote.source': '— SÉRIE AFFAIR',

    // Latest Updates
    'updates.title': 'Últimas novidades',
    'updates.photoshoot': 'Novo ensaio fotográfico',
    'updates.season2': 'Affair Temporada 2',
    'updates.fanmeet': 'Fan meeting',
    'updates.gallery': 'Galeria',
    'updates.series': 'Séries',
    'updates.schedule': 'Agenda',
    'updates.comingSoon': 'Em breve',
    'updates.jan2025': 'Jan 2025',
    'updates.dec2024': 'Dez 2024',

    // CTA
    'cta.title': 'Explore a história delas',
    'cta.description': 'Descubra a jornada de Lookmhee e Sonya através dos projetos, da galeria e dos próximos eventos.',
    'cta.meetDuo': 'Junte-se à jornada, Besties',
    'cta.viewGallery': 'Ver galeria',

    // Profiles
    'profiles.title': 'Perfis',
    'profiles.description': 'Conheça Lookmhee e Sonya, a dupla talentosa da série Affair.',
    'profiles.viewProfile': 'Ver perfil',
    'profiles.back': 'Voltar aos perfis',

    // Profile Detail
    'profile.biography': 'BIOGRAFIA',
    'profile.born': 'NASCIMENTO',
    'profile.height': 'ALTURA',
    'profile.works': 'TRABALHOS',
    'profile.quote': '"Grata por cada oportunidade de compartilhar histórias que tocam o coração."',
    'profile.yearsOld': '{age} anos',
    'profile.lead': 'Protagonista',
    'profile.supporting': 'Coadjuvante',
    'profile.guest': 'Convidada',

    // Gallery
    'gallery.title': 'Galeria',
    'gallery.description': 'Fotograma a fotograma, as imagens preservam o tempo que elas atravessaram.',
    'gallery.noImages': 'Nenhuma imagem com esta etiqueta.',
    'gallery.tagAll': 'Todas',
    'gallery.tagMagazine': 'Revista',
    'gallery.tagAdvertising': 'Publicidade',
    'gallery.tagStage': 'Palco',
    'gallery.tagStill': 'Fotograma',
    'gallery.tagUntagged': 'Sem etiqueta',
    'gallery.viewProject': 'Ver projeto',
    'gallery.viewAllProjectImages': 'Ver todas as imagens deste projeto',

    // Projects
    'projects.title': 'Projetos',
    'projects.description': 'Aqui estão todas as obras. O tempo já as colocou em ordem.',
    'projects.relatedTitle': 'Mais nesta categoria',
    'projects.filteredEmpty': 'Não há projetos nesta categoria.',

    // Schedule
    'schedule.title': 'Agenda',
    'schedule.description': 'Fique por dentro dos próximos eventos, aparições e atividades.',
    'schedule.upcoming': 'Próximos eventos',
    'schedule.past': 'Eventos passados',
    'schedule.noEvents': 'Nenhum evento programado.',
    'schedule.watchNow': 'Assistir agora',

    // Construction Banner
    'banner.message': 'Bem-vinda a este universo de amor ainda inacabado, querida Bestie. Este lugar se completa, aos pouquinhos.',
    'banner.status': 'EM CONSTRUÇÃO',

    // Hero Section
    'hero.curator': 'Curado por Astra',
    'hero.portalsTitle': 'Portais',
    'hero.portalsSubtitle': 'Entre nas diferentes dimensões da história delas.',

    // Portals
    'portal.drama': 'Dramas e obras',
    'portal.dramaDesc': 'Foi aqui que elas apareceram pela primeira vez.',
    'portal.live': 'Eventos ao vivo',
    'portal.liveDesc': 'Os momentos vividos juntas.',
    'portal.journey': 'Jornada',
    'portal.journeyDesc': 'Caminhos percorridos juntas',
    'portal.daily': 'Dia a dia',
    'portal.dailyDesc': 'Dias comuns e bonitos',
    'portal.commercial': 'Comerciais',
    'portal.commercialDesc': 'Mais facetas da ressonância delas com o mundo.',
    'portal.editorial': 'Editorial',
    'portal.editorialDesc': 'Na frente e atrás das câmeras.',
    'portal.appearance': 'Aparições públicas',
    'portal.appearanceDesc': 'Cada vez que elas aparecem.',

    // Micro-Chronicle
    'chronicle.title': 'Crônica',
    'chronicle.badge': 'Linha do tempo do acervo',
    'chronicle.desc': 'Uma visão cronológica das obras e imagens do site: cada lançamento, ensaio e momento em um só registro contínuo.',
    'chronicle.hint': 'Os cartões de projeto abrem a obra; os de imagem abrem um visor com link para o projeto.',
    'chronicle.entries': 'Entradas',
    'chronicle.type': 'Fonte',
    'chronicle.sourceLabel': 'Obras e imagens',
    'chronicle.view': 'Imagens',
    'chronicle.yearFilter': 'Ano',
    'chronicle.clearYear': 'Ver todos os anos',
    'chronicle.emptyAll': 'Ainda não há eventos registrados.',
    'chronicle.emptyYear': 'A história deste ano ainda não se desdobrou aqui. Novas descobertas serão adicionadas com o tempo.',
    'chronicle.eventProject': 'Projeto',
    'chronicle.eventImages': 'Imagens',
    'chronicle.viewProject': 'Ver projeto',
    'chronicle.imageOne': 'imagem',
    'chronicle.imageMany': 'imagens',

    // Resonance (music section - not launched yet)
    'resonance.comingSoon': 'Em breve',
    'resonance.comingSoonDesc': 'A seção de música está sendo preparada. Ainda não há nada anunciado: esta página se acende quando houver algo de verdade para tocar.',

    // Editorial empty state
    'editorial.emptyTitle': 'Ainda não há editoriais',
    'editorial.emptyDesc': 'Os especiais de revista aparecerão aqui assim que publicados.',

    // Search (phase 5)
    'search.placeholder': 'Buscar fotos, projetos…',
    'search.open': 'Abrir busca',
    'search.clear': 'Limpar busca',
    'search.noResults': 'Nenhum resultado',
    'search.noResultsHint': 'Tente outras palavras ou explore a galeria',
    'search.error': 'A busca está temporariamente indisponível. Tente novamente mais tarde.',
    'search.quickAccess': 'Acesso rápido',
    'search.typeProject': 'Projeto',
    'search.typeGallery': 'Foto',
    'search.typeExhibition': 'Coleção',
    'search.footerNavigate': 'Use as setas para navegar',
    'search.footerEnter': 'Enter para abrir',
    'search.footerEsc': 'Esc para fechar',

    // Whispers (community message wall)
    'whispers.subtitle': 'Recolhendo a ressonância das Besties',
    'whispers.empty': 'Procurando ecos...',
    'whispers.notice': 'Todos os sinais são revisados antes de entrar no acervo',
    'whispers.formTitle': 'Transmita o seu sinal',
    'whispers.formDesc': 'Sua mensagem será revisada antes de entrar no acervo',
    'whispers.message': 'Sua mensagem',
    'whispers.messagePlaceholder': 'Deixe um sinal neste espaço...',
    'whispers.authorPlaceholder': 'Seu nome',
    'whispers.authorLabel': 'Assinatura',
    'whispers.locationPlaceholder': 'Cidade ou galáxia',
    'whispers.locationLabel': 'Coordenadas (opcional)',
    'whispers.energyLabel': 'Escolha a sua cor de energia',
    'whispers.errContent': 'REQUIRED_SIGNAL_MISSING',
    'whispers.errAuthor': 'REQUIRED_IDENTITY_MISSING',
    'whispers.solar': 'Solar',
    'whispers.lunar': 'Lunar',
    'whispers.success': 'Sinal transmitido. Aguardando aprovação da ressonância...',
    'whispers.submitting': 'Transmitindo...',
    'whispers.submit': '[ EMITIR_SINAL ]',
    'whispers.openForm': '[ TRANSMITIR_SINAL ]',
    'whispers.failed': 'Não foi possível enviar a mensagem',
    'whispers.networkError': 'Erro de rede. Tente novamente.',
    'whispers.gates': 'Os Portões dos Sussurros',
    'vinyl.listen': 'Ouça a ressonância',

    // 404 not-found
    'nf.title': 'Página não encontrada',
    'nf.desc': 'A página que você procura não existe ou foi movida.',
    'nf.home': 'Ir para o início',
    'nf.back': 'Voltar',

    // Route error boundary
    'err.label': 'Transmissão interrompida',
    'err.title': 'Algo deu errado',
    'err.desc': 'Não foi possível carregar esta parte do acervo. Tente novamente.',
    'err.retry': 'Tentar de novo',

    // Editorial
    'editorial.title': 'Revistas',
    'editorial.subtitle': 'Revistas e publicações',
    'editorial.viewIssue': 'Ver edição',
    'editorial.photographer': 'Fotografia',
    'editorial.stylist': 'Estilo',
    'editorial.published': 'Publicado',
    'editorial.backToGallery': 'Voltar à galeria',
    'editorial.noIssues': 'Ainda não há edições disponíveis.',
    'editorial.comingSoon': 'Mais edições em breve...',

    // Exhibitions
    'exhibitions.title': 'Exposições',
    'exhibitions.subtitle': 'Coleções curadas de histórias visuais',

    // Footer
    'footer.tagline': 'Um espaço dedicado à LMSY e às suas Besties.',
    'footer.quickLinks': 'Links rápidos',
    'footer.followUs': 'Siga a gente',
    'footer.copyright': '© {year} LMSY Fan Site. Todos os direitos reservados.',
    'footer.madeWith': 'Feito com 💛 e 💙 por uma Bestie, para todas as Besties',
    'footer.instagram': 'Instagram',
    'footer.twitter': 'Twitter',
    'footer.disclaimer': 'Aviso de copyright: o lmsy.space é um projeto de fãs sem fins lucrativos. Todas as mídias pertencem aos seus respectivos proprietários.',

    // Shared presentation (phase 6 batch 1)
    'common.viewDetails': 'Ver detalhes',
    'common.watch': 'Assistir',
    'common.loadMore': 'Carregar mais',
    'common.loading': 'Carregando…',
    'common.imagesOne': 'imagem',
    'common.imagesMany': 'imagens',
    'common.close': 'Fechar',
    'common.previous': 'Anterior',
    'common.next': 'Próxima',
    'common.source': 'Fonte',
    'common.noImage': 'Imagem indisponível',
    'common.curatorNote': 'Nota da curadora',

    // Archive credit lines (editorial + project detail)
    'credit.officialTitle': 'Conteúdo oficial',
    'credit.official': 'Todas as mídias pertencem aos editores originais. Preservadas para apreciação.',
    'credit.fanTitle': 'Conteúdo captado por fãs',
    'credit.fan': 'Agradecimento especial às Besties que captaram esses momentos efêmeros.',

    // Work categories (single source shared by Projects, detail and Chronicle)
    'category.series': 'Séries',
    'category.editorial': 'Editorial',
    'category.appearance': 'Aparição',
    'category.commercial': 'Comercial',
    'category.journal': 'Diário',
    'category.daily': 'Dia a dia',
    'category.travel': 'Viagens',
    'category.music': 'Videoclipe',
    'category.magazine': 'Revista',
    'category.other': 'Outros',
    // Stable eight-category vocabulary (see lib/category-registry.ts)
    'category.dramaWork': 'Dramas e obras',
    'category.liveEvent': 'Eventos ao vivo',
    'category.publicAppearance': 'Aparições públicas',
    'door.talks': 'Conversas',
    'door.live': 'Lives',
    'category.interview': 'Entrevistas',
    'category.variety': 'Variedades',
    'category.radio': 'Rádio',
    'talks.bilibili': 'Vídeo do Bilibili',
    'talks.youtube': 'Vídeo do YouTube',
    'talks.photos': 'Fotos',
    'talks.transcript': 'Transcrição',
    'talks.watch': 'Assistir',
    'talks.read': 'Ler',
    'category.liveStream': 'Lives',
    'category.behindTheScenes': 'Bastidores',
    'category.personalTravel': 'Pessoal e viagens',
    'category.earlyArchive': 'Acervo inicial',

    // Navigation (phase 7: four entries + search)
    'nav.timeline': 'Linha do tempo',
    'nav.people': 'Elas',

    // Homepage sections
    'home.collecting': 'Em coleta',
    'home.featuredTitle': 'Ressonância da alma',
    'home.featuredSubtitle': 'A cumplicidade entre ela e ela',
    'home.talkDoor': 'Conversas',
    'home.talkDoorHint': 'Outros perguntaram, e depois cortaram.',
    'home.liveDoor': 'Lives',
    'home.liveDoorHint': 'Sem cortes e sem ninguém perguntando.',
    'home.talkEntries': '{count} entradas',
    'home.liveEntries': '{count} lives',
    'home.timelineTitle': 'Reencontrá-las através do tempo',
    'home.timelineSubtitle': 'Há memórias que valem a pena ser revisitadas',
    'home.peopleTitle': 'Elas e as Besties',
    'home.peopleSubtitle': 'Começou por amar o trabalho delas. Continua porque as memórias merecem ser guardadas.',

    // /talks and /live - the two soul-resonance landing pages
    'talks.title': 'Conversas',
    'talks.description': 'Entrevistas, variedades e rádio.',
    'talks.tabAll': 'Tudo',
    'talks.tabInterview': 'Entrevistas',
    'talks.tabVariety': 'Variedades',
    'talks.tabRadio': 'Rádio',

    // /dramas - the door for everything they acted in
    'dramas.title': 'Séries',
    'dramas.description': 'Séries e material relacionado.',
    'dramas.eventCount': '{count} entradas',
    'dramas.viewSeries': 'Abrir a série',

    // Doors 2-5 (homepage entries with a page of their own)
    'door.description.liveEvents': 'Fan meetings, festas de aniversário e eventos de marca.',
    'door.description.appearances': 'Premiações, semanas de moda e eventos da empresa.',
    'door.description.commercial': 'Anúncios e publicidade.',
    'door.viewCategory': 'Abrir a estante',
    'door.unfiled': 'Ainda sem classificação',
    'door.video': 'Vídeo',
    'drama.footageCount': '{count} fotogramas e clipes',
    'drama.back': 'Voltar às séries',
    'drama.eventImages': '{count} imagens',
    'drama.noImages': 'Imagens a caminho',
    'drama.backToEvent': 'Voltar à série',
    'drama.relatedImages': 'Imagens relacionadas',
    'drama.watchExternal': 'Assistir na plataforma',
    'drama.watchNote': 'Esta página é a introdução. A exibição acontece na plataforma original.',
    'drama.linkPending': 'Link de exibição a confirmar',
    'subtype.affair': 'Affair',
    'subtype.harmony_secret': 'Harmony Secret',
    'subtype.hometown_romance': 'Hometown Romance',
    'drama.group.seriesBody': 'A série',
    'drama.group.premiere': 'Estreias',
    'drama.group.music': 'Música',
    'drama.group.novel': 'O romance',
    'drama.group.promo': 'Anúncios',
    'drama.group.footage': 'Material',
    'drama.group.award': 'Prêmios',
    'drama.awardWon': 'Vencido',
    'drama.awardNominated': 'Indicado',
    'live.title': 'Lives',
    'live.description': 'Lives em dupla e individuais.',
    'live.tabAll': 'Tudo',
    'live.tabDuo': 'As duas',

    // Timeline
    'timeline.title': 'Linha do tempo',
    'timeline.description': 'De um dia a outro digno de lembrança, percorra os anos de volta no tempo.',
    'timeline.emptyYear': 'A história deste ano ainda não se desdobrou aqui. Novas descobertas serão adicionadas com o tempo.',
    'timeline.records': '{count} registros',
    'timeline.unknownDate': 'Sem data',

    // People
    'people.title': 'Elas',
    'people.description': 'Este acervo começou com elas, e elas continuam sendo o motivo de seguir reunindo.',
    'people.relatedProjects': '{count} entradas',
    'people.noProjects': 'As obras ligadas a esta pessoa ainda estão sendo reunidas.',
    'people.birthday': 'Aniversário',

    // Project detail
    'project.tabAll': 'Tudo',
    'project.tabStills': 'Cenas',
    'project.tabBts': 'Bastidores',
    'project.tabPress': 'Imprensa e eventos',
    'project.watchNow': 'Assistir agora',
    'project.emptyTitle': 'Ainda não há imagens nesta categoria.',
    'project.emptyDesc': 'O material novo aparece aqui depois de curado.',
    'project.interview': 'Entrevista',
    'project.watchInterview': 'Assistir à entrevista',
    'project.cover': 'Capa',
    'project.featured': 'Destaques',
    'project.unsorted': 'Sem ordenar',
    'project.dateUnknown': 'Data desconhecida',
    'project.noteStillsTitle': 'Nota da curadora',
    'project.noteStills':
      'Estas cenas selecionadas preservam a textura da obra e a linguagem visual que define este projeto.',
    'project.noteBtsTitle': 'Bastidores',
    'project.noteBts':
      'Momentos entre as tomadas: o processo, as risadas e o ofício que dão vida a uma história.',
    'project.notePressTitle': 'Imprensa e eventos',
    'project.notePress':
      'A jornada pública: tapetes vermelhos, coletivas de imprensa e a emoção compartilhada com fãs e mídia.',

    // Gallery states
    'gallery.emptyAll': 'Aqui ainda não há imagens. Astra vai seguir reunindo-as com cuidado.',
    'gallery.emptyFiltered': 'Nenhuma imagem corresponde a este filtro.',
    'gallery.resetFilter': 'Ver todas as imagens',

    // Projects list states
    'projects.emptyAll': 'Esta página ainda está tomando forma. Mais obras chegarão aqui.',
    'projects.photoCount': '{count} imagens',
    'projects.noImages': 'Ainda não há imagens do acervo',
    'projects.kindTheme': 'Temas',

    // Sub-class tabs inside a hall. Only halls listed in
    // SUBTYPES_BY_CATEGORY render these, and only when two or more have rows.
    'subtype.concert': 'Shows e turnês',
    'subtype.fanmeeting': 'Fan meetings',
    'subtype.fansign': 'Fan signs',
    'subtype.brand_event': 'Eventos de marca',
    'subtype.birthday': 'Aniversários',
    'subtype.company': 'Eventos da empresa',
    'subtype.awards': 'Prêmios',
    'subtype.fashion': 'Semanas de moda',
    'subtype.brand_stage': 'Aparições de marca',
    'subtype.charity': 'Beneficência',
    'subtype.industry': 'Setor',
    'subtype.duo': 'As duas',
    // One name, one shelf: a stream by one of them is hers, not "solo".
    'subtype.lookmhee': 'Lookmhee',
    'subtype.sonya': 'Sonya',

    // Editorial meta
    'editorial.issueCount': '{count} edições curadas',
    'editorial.releaseDate': 'Data de lançamento',
    'editorial.artifacts': 'Peças',
    'editorial.curatorNote': 'Nota da curadora',
    'editorial.insideIssue': 'Dentro desta edição',
    'editorial.pagesPreserved': '{count} páginas preservadas',
    'editorial.pagesEmpty': 'Esta edição ainda não tem páginas digitalizadas.',
    'editorial.pagesEmptyHint': 'As páginas aparecem aqui depois de curadas.',
    'editorial.noCover': 'Sem capa',
    'editorial.dateTbd': 'Data a confirmar',
    'editorial.loading': 'Carregando',

    // Features door (/features) - special topics rack
    'features.title': 'Especiais',
    'features.subtitle': 'Temas especiais',
    'features.viewIssue': 'Ver tema',
    'features.artifacts': 'Peças',
    'features.noCover': 'Sem capa',
    'features.emptyTitle': 'Ainda não há temas disponíveis',
    'features.emptyDesc': 'Os temas especiais aparecerão aqui assim que publicados.',
    'features.issueCount': '{count} temas curados',
    'features.dateTbd': 'Data a confirmar',
    'features.releaseDate': 'Data de lançamento',
    'features.curatorNote': 'Nota da curadora',
    'features.pagesEmpty': 'Este tema ainda não tem imagens digitalizadas.',
    'features.pagesEmptyHint': 'As imagens aparecem aqui depois de curadas.',
    'features.insideIssue': 'Dentro deste tema',
    'features.pagesPreserved': '{count} imagens preservadas',

    // Live-events timeline (level 2 shelf)
    'live.allPhotos': 'Todas as fotos',
    'live.viewAll': 'Ver tudo',

    // Chronicle empty state helper
    'chronicle.tryAnotherYear': 'Tente outro ano:',

    // Homepage CTAs
    'home.explore': 'Explorar',
    'home.enterArchive': 'Entrar no acervo',
    'home.storyContinues': 'A história continua',

    // Copyright Page
    'copyright.title': 'Política de Direitos Autorais',
    'copyright.subtitle': 'Respeitando os criadores, preservando memórias',
    'copyright.intro': 'O lmsy.space é um projeto de fãs sem fins lucrativos, dedicado a preservar e compartilhar os momentos bonitos de Lookmhee e Sonya com as fãs do mundo inteiro.',
    'copyright.disclaimerTitle': 'Aviso de direitos autorais',
    'copyright.disclaimerText': 'Todo o conteúdo de mídia (imagens, vídeos, artigos etc.) exibido neste site pertence aos seus respectivos proprietários, incluindo, sem se limitar a, produtoras, revistas, fotógrafos e canais oficiais. Não reivindicamos a propriedade de nenhum material protegido.',
    'copyright.fairUseTitle': 'Uso justo',
    'copyright.fairUseText': 'O conteúdo é compartilhado para fins educativos e de acervo, para documentar a carreira e a trajetória artística de Lookmhee e Sonya. Acreditamos que isso constitui uso justo conforme a Seção 107 da Lei de Direitos Autorais.',
    'creditTitle': 'Créditos e atribuição',
    'creditText': 'Nos esforçamos para dar a devida atribuição a todo o conteúdo. Sempre que possível, creditamos fotógrafos, publicações e fontes. Se notar créditos ausentes ou incorretos, entre em contato.',
    'copyright.contactTitle': 'Reclamações por violação de direitos autorais',
    'copyright.contactText': 'Se você é titular de direitos e acredita que algum conteúdo viola os seus direitos, entre em contato com as seguintes informações:',
    'copyright.contactItem1': '• Seu nome e dados de contato',
    'copyright.contactItem2': '• Descrição da obra protegida',
    'copyright.contactItem3': '• Localização do conteúdo que viola (URL)',
    'copyright.contactItem4': '• Declaração de boa-fé',
    'copyright.contactEmail': 'E-mail de contato:',
    'copyright.responseTime': 'Respondemos a reclamações válidas em até 48 horas e removemos ou atribuímos corretamente o conteúdo.',
    'copyright.backHome': 'Voltar ao início',

    // Página Sobre
    'about.title': 'Sobre',
    'about.whatTitle': 'O que é este site',
    'about.whatText1':
      'O LMSY Fan Archive é um arquivo não oficial feito por fãs da dupla GL tailandesa LMSY — Lookmhee Punyapat Wangpongsathaporn e Sonya Saranphat Pedersen.',
    'about.whatText2':
      'Este site é um esforço de coleta: fotos, editoriais de revista, eventos e registros são organizados em um arquivo navegável, com cada entrada catalogada por data e fonte.',
    'about.disclaimerTitle': 'Aviso de não oficialidade',
    'about.disclaimerText':
      'Este site é mantido por Astra e não é afiliado ou ligado ao LMSY, à sua agência (CHANGE2561) ou a qualquer fã-clube oficial.',
    'about.contactTitle': 'Direitos autorais e contato',
    'about.contactText1':
      'Todas as fotografias e conteúdos pertencem aos seus respectivos detentores de direitos. As imagens são creditadas às fontes originais sempre que possível e são apresentadas aqui apenas para fins de arquivo e apreciação.',
    'about.contactText2':
      'Se você é titular de direitos e deseja que algo seja removido ou creditado de outra forma, entre em contato:',
    'about.seeAlso': 'Ver também: ',

    // Site-level copy (root layout metadata, loading state)
    'site.description': 'Arquivo de fãs da dupla GL tailandesa LMSY (Lookmhee & Sonya), protagonistas da série Affair. Perfis, galeria, projetos e agenda em dia.',
    'site.keywords': 'LMSY, Lookmhee, Sonya, Affair, GL tailandesa, girls love, drama tailandês, série Affair',
    'site.loading': 'Carregando o acervo',
    // Door meta descriptions (SEO snippets) — see en.ts for the note.
    'meta.about': 'Sobre o LMSY Fan Archive: um arquivo não oficial feito por fãs da dupla GL tailandesa LMSY (Lookmhee & Sonya).',
    'meta.appearances': 'Prêmios, semanas de moda, palcos de marca, eventos de empresa: cada vez que Lookmhee & Sonya saíram e foram vistas.',
    'meta.commercial': 'Campanhas, contratos de imagem e filmes de marca que Lookmhee & Sonya fizeram, guardados aqui com as fotos por trás deles.',
    'meta.copyright': 'O lmsy.space é um projeto de fãs sem fins lucrativos, dedicado a preservar e compartilhar os momentos bonitos de Lookmhee & Sonya com fãs do mundo todo.',
    'meta.dramas': 'Toda história que Lookmhee & Sonya contaram, num lugar só: as séries, a música delas, os livros por trás, os anúncios e os prêmios.',
    'meta.editorial': 'Cada edição de revista e publicação em que Lookmhee & Sonya apareceram, com as capas e as páginas.',
    'meta.features': 'Temas especiais fora das portas de sempre: coleções de fotos por tema, com as capas e as páginas.',
    'meta.gallery': 'Todas as fotos do acervo: editoriais de revista, publicidade, palco e stills, com navegação e filtro por tag.',
    'meta.live': 'As lives que Lookmhee & Sonya abriram sozinhas: sem corte, sem entrevistador, o mais perto de ouvir elas falando por conta própria.',
    'meta.liveEvents': 'Fan meetings, noites de marca e aniversários: cada lugar onde Lookmhee & Sonya estiveram, guardado em fotos.',
    'meta.people': 'As duas pessoas em volta de quem este arquivo foi feito.',
    'meta.schedule': 'A agenda de Lookmhee & Sonya, o que vem e o que passou: eventos, transmissões e aparições.',
    'meta.talks': 'Entrevistas, programas de variedade e rádio: cada vez que alguém perguntou a Lookmhee & Sonya e publicou a resposta.',
    'meta.timeline': 'Cada registro com data do acervo, na ordem em que realmente aconteceu.',

};
