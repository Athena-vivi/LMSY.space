// Spanish UI strings. SEO-first: uses the terms Spanish-speaking GL fans
// actually search (Galería, Crónica, fan meetings, premios, semanas de la
// moda...). Names (LMSY, Lookmhee, Sonya, Besties) are never translated.
// Must cover every key in ./en.
import type { TranslationKey } from './en.ts';

export const es: Record<TranslationKey, string> = {
    // Navigation
    'nav.home': 'Inicio',
    'nav.chronicle': 'Crónica',
    'nav.exhibitions': 'Exposiciones',
    'nav.editorial': 'Editorial',
    'nav.resonance': 'Resonancia',
    'nav.duality': 'Dualidad',
    'nav.profiles': 'Perfiles',
    'nav.gallery': 'Galería',
    'nav.projects': 'Proyectos',
    'nav.copyright': 'Copyright',
    'nav.about': 'Acerca de',
    'nav.schedule': 'Agenda',
    'nav.toggleTheme': 'Cambiar tema',
    'nav.toggleMenu': 'Abrir menú',
    'nav.viewAll': 'Ver todo',
    'nav.lmsy': 'LMSY',
    'nav.lookmhee': 'Lookmhee',
    'nav.sonya': 'Sonya',

    // Hero
    'hero.lmsy': 'LMSY',
    'hero.subtitle': 'Lookmhee & Sonya',
    'hero.scroll': 'DESLIZA',
    'hero.lookmhee': 'LOOKMHEE',
    'hero.sonya': 'SONYA',
    'hero.besties': 'Un espacio dedicado a LMSY y sus Besties.',
    'splash.entering': 'Entrando en la primera órbita',
    'splash.plaque': '{events} eventos · {images} imágenes',

    // Quote
    'quote.text': '"Hay sentimientos imposibles de ocultar, por mucho que lo intentes..."',
    'quote.source': '— SERIE AFFAIR',

    // Latest Updates
    'updates.title': 'Últimas novedades',
    'updates.photoshoot': 'Nueva sesión de fotos',
    'updates.season2': 'Affair Temporada 2',
    'updates.fanmeet': 'Fan meeting',
    'updates.gallery': 'Galería',
    'updates.series': 'Series',
    'updates.schedule': 'Agenda',
    'updates.comingSoon': 'Próximamente',
    'updates.jan2025': 'Ene 2025',
    'updates.dec2024': 'Dic 2024',

    // CTA
    'cta.title': 'Explora su historia',
    'cta.description': 'Descubre el camino de Lookmhee y Sonya a través de sus proyectos, galería y próximos eventos.',
    'cta.meetDuo': 'Únete al viaje, Besties',
    'cta.viewGallery': 'Ver galería',

    // Profiles
    'profiles.title': 'Perfiles',
    'profiles.description': 'Conoce a Lookmhee y Sonya, el dúo talentoso de la serie Affair.',
    'profiles.viewProfile': 'Ver perfil',
    'profiles.back': 'Volver a perfiles',

    // Profile Detail
    'profile.biography': 'BIOGRAFÍA',
    'profile.born': 'NACIMIENTO',
    'profile.height': 'ESTATURA',
    'profile.works': 'TRABAJOS',
    'profile.quote': '"Agradecida por cada oportunidad de compartir historias que tocan el corazón."',
    'profile.yearsOld': '{age} años',
    'profile.lead': 'Protagonista',
    'profile.supporting': 'Secundario',
    'profile.guest': 'Invitada',

    // Gallery
    'gallery.title': 'Galería',
    'gallery.description': 'Fotograma a fotograma, las imágenes conservan el tiempo que han atravesado.',
    'gallery.noImages': 'No hay imágenes con esta etiqueta.',
    'gallery.tagAll': 'Todas',
    'gallery.tagMagazine': 'Revista',
    'gallery.tagAdvertising': 'Publicidad',
    'gallery.tagStage': 'Escenario',
    'gallery.tagStill': 'Fotograma',
    'gallery.tagUntagged': 'Sin etiqueta',
    'gallery.viewProject': 'Ver proyecto',
    'gallery.viewAllProjectImages': 'Ver todas las imágenes de este proyecto',

    // Projects
    'projects.title': 'Proyectos',
    'projects.description': 'Aquí están todas las obras. El tiempo ya las puso en orden.',
    'projects.relatedTitle': 'Más en esta categoría',
    'projects.filteredEmpty': 'No hay proyectos en esta categoría.',

    // Schedule
    'schedule.title': 'Agenda',
    'schedule.description': 'Entérate de los próximos eventos, apariciones y actividades.',
    'schedule.upcoming': 'Próximos eventos',
    'schedule.past': 'Eventos pasados',
    'schedule.noEvents': 'No hay eventos programados.',
    'schedule.watchNow': 'Ver ahora',

    // Construction Banner
    'banner.message': 'Bienvenida a este universo de amor aún incompleto, querida Bestie. Este lugar se completa, poquito a poco.',
    'banner.status': 'EN CONSTRUCCIÓN',

    // Hero Section
    'hero.curator': 'Curado por Astra',
    'hero.portalsTitle': 'Portales',
    'hero.portalsSubtitle': 'Entra en las distintas dimensiones de su historia.',

    // Portals
    'portal.drama': 'Dramas y obras',
    'portal.dramaDesc': 'Aquí las vieron por primera vez.',
    'portal.live': 'Eventos en vivo',
    'portal.liveDesc': 'Los momentos vividos juntas.',
    'portal.journey': 'Trayecto',
    'portal.journeyDesc': 'Caminos recorridos juntas',
    'portal.daily': 'Día a día',
    'portal.dailyDesc': 'Días ordinarios y bellos',
    'portal.commercial': 'Comerciales',
    'portal.commercialDesc': 'Más facetas de su resonancia con el mundo.',
    'portal.editorial': 'Editorial',
    'portal.editorialDesc': 'Delante y detrás de la cámara.',
    'portal.appearance': 'Apariciones públicas',
    'portal.appearanceDesc': 'Cada vez que salen a la vista.',

    // Micro-Chronicle
    'chronicle.title': 'Crónica',
    'chronicle.badge': 'Línea de tiempo del archivo',
    'chronicle.desc': 'Una vista cronológica de las obras e imágenes del sitio: cada lanzamiento, sesión y momento en un solo registro continuo.',
    'chronicle.hint': 'Las tarjetas de proyecto abren la obra; las de imagen abren un visor con enlace al proyecto.',
    'chronicle.entries': 'Entradas',
    'chronicle.type': 'Fuente',
    'chronicle.sourceLabel': 'Obras e imágenes',
    'chronicle.view': 'Imágenes',
    'chronicle.yearFilter': 'Año',
    'chronicle.clearYear': 'Ver todos los años',
    'chronicle.emptyAll': 'Aún no hay eventos registrados.',
    'chronicle.emptyYear': 'La historia de este año aún no se despliega aquí. Con el tiempo se añadirán nuevos hallazgos.',
    'chronicle.eventProject': 'Proyecto',
    'chronicle.eventImages': 'Imágenes',
    'chronicle.viewProject': 'Ver proyecto',
    'chronicle.imageOne': 'imagen',
    'chronicle.imageMany': 'imágenes',

    // Resonance (music section - not launched yet)
    'resonance.comingSoon': 'Próximamente',
    'resonance.comingSoonDesc': 'La sección de música se está preparando. Todavía no hay nada anunciado: esta página se encenderá cuando haya algo real que escuchar.',

    // Editorial empty state
    'editorial.emptyTitle': 'Aún no hay editoriales',
    'editorial.emptyDesc': 'Los especiales de revista aparecerán aquí una vez publicados.',

    // Search (phase 5)
    'search.placeholder': 'Busca fotos, proyectos…',
    'search.open': 'Abrir búsqueda',
    'search.clear': 'Borrar búsqueda',
    'search.noResults': 'Sin resultados',
    'search.noResultsHint': 'Prueba otras palabras o explora la galería',
    'search.error': 'La búsqueda no está disponible temporalmente. Inténtalo más tarde.',
    'search.quickAccess': 'Acceso rápido',
    'search.typeProject': 'Proyecto',
    'search.typeGallery': 'Foto',
    'search.typeExhibition': 'Colección',
    'search.footerNavigate': 'Usa las flechas para navegar',
    'search.footerEnter': 'Enter para abrir',
    'search.footerEsc': 'Esc para cerrar',

    // Whispers (community message wall)
    'whispers.subtitle': 'Recogiendo la resonancia de las Besties',
    'whispers.empty': 'Buscando ecos...',
    'whispers.notice': 'Todas las señales se revisan antes de entrar al archivo',
    'whispers.formTitle': 'Transmite tu señal',
    'whispers.formDesc': 'Tu mensaje será revisado antes de unirse al archivo',
    'whispers.message': 'Tu mensaje',
    'whispers.messagePlaceholder': 'Deja una señal en este espacio...',
    'whispers.authorPlaceholder': 'Tu nombre',
    'whispers.authorLabel': 'Firma',
    'whispers.locationPlaceholder': 'Ciudad o galaxia',
    'whispers.locationLabel': 'Coordenadas (opcional)',
    'whispers.energyLabel': 'Elige tu color de energía',
    'whispers.errContent': 'REQUIRED_SIGNAL_MISSING',
    'whispers.errAuthor': 'REQUIRED_IDENTITY_MISSING',
    'whispers.solar': 'Solar',
    'whispers.lunar': 'Lunar',
    'whispers.success': 'Señal transmitida. Esperando aprobación de resonancia...',
    'whispers.submitting': 'Transmitiendo...',
    'whispers.submit': '[ EMITIR_SEÑAL ]',
    'whispers.openForm': '[ TRANSMITIR_SEÑAL ]',
    'whispers.failed': 'No se pudo enviar el mensaje',
    'whispers.networkError': 'Error de red. Inténtalo de nuevo.',
    'whispers.gates': 'Las puertas del susurro',
    'vinyl.listen': 'Escucha la resonancia',

    // 404 not-found
    'nf.title': 'Página no encontrada',
    'nf.desc': 'La página que buscas no existe o se ha movido.',
    'nf.home': 'Ir al inicio',
    'nf.back': 'Volver',

    // Route error boundary
    'err.label': 'Transmisión interrumpida',
    'err.title': 'Algo salió mal',
    'err.desc': 'No se pudo cargar esta parte del archivo. Inténtalo de nuevo.',
    'err.retry': 'Reintentar',

    // Editorial
    'editorial.title': 'Revistas',
    'editorial.subtitle': 'Revistas y publicaciones',
    'editorial.viewIssue': 'Ver número',
    'editorial.photographer': 'Fotografía',
    'editorial.stylist': 'Estilismo',
    'editorial.published': 'Publicado',
    'editorial.backToGallery': 'Volver a la galería',
    'editorial.noIssues': 'Aún no hay números disponibles.',
    'editorial.comingSoon': 'Más números próximamente...',

    // Exhibitions
    'exhibitions.title': 'Exposiciones',
    'exhibitions.subtitle': 'Colecciones curadas de historias visuales',

    // Footer
    'footer.tagline': 'Un espacio dedicado a LMSY y sus Besties.',
    'footer.quickLinks': 'Enlaces rápidos',
    'footer.followUs': 'Síguenos',
    'footer.copyright': '© {year} LMSY Fan Site. Todos los derechos reservados.',
    'footer.madeWith': 'Hecho con 💛 y 💙 por una Bestie, para todas las Besties',
    'footer.instagram': 'Instagram',
    'footer.twitter': 'Twitter',
    'footer.disclaimer': 'Aviso de copyright: lmsy.space es un proyecto de fans sin ánimo de lucro. Todos los medios pertenecen a sus respectivos propietarios.',

    // Shared presentation (phase 6 batch 1)
    'common.viewDetails': 'Ver detalles',
    'common.watch': 'Ver',
    'common.loadMore': 'Cargar más',
    'common.loading': 'Cargando…',
    'common.imagesOne': 'imagen',
    'common.imagesMany': 'imágenes',
    'common.close': 'Cerrar',
    'common.previous': 'Anterior',
    'common.next': 'Siguiente',
    'common.source': 'Fuente',
    'common.noImage': 'Imagen no disponible',
    'common.curatorNote': 'Nota de la curadora',

    // Archive credit lines (editorial + project detail)
    'credit.officialTitle': 'Contenido oficial',
    'credit.official': 'Todos los medios pertenecen a los editores originales. Conservados para su disfrute.',
    'credit.fanTitle': 'Contenido captado por fans',
    'credit.fan': 'Gracias especiales a las Besties que captaron estos momentos efímeros.',

    // Work categories (single source shared by Projects, detail and Chronicle)
    'category.series': 'Series',
    'category.editorial': 'Editorial',
    'category.appearance': 'Aparición',
    'category.commercial': 'Comercial',
    'category.journal': 'Diario',
    'category.daily': 'Día a día',
    'category.travel': 'Viajes',
    'category.music': 'Videoclip',
    'category.magazine': 'Revista',
    'category.other': 'Otros',
    // Stable eight-category vocabulary (see lib/category-registry.ts)
    'category.dramaWork': 'Dramas y obras',
    'category.liveEvent': 'Eventos en vivo',
    'category.publicAppearance': 'Apariciones públicas',
    'door.talks': 'Conversaciones',
    'door.live': 'Directos',
    'category.interview': 'Entrevistas',
    'category.variety': 'Variedades',
    'category.radio': 'Radio',
    'talks.bilibili': 'Vídeo de Bilibili',
    'talks.youtube': 'Vídeo de YouTube',
    'talks.photos': 'Fotos',
    'talks.transcript': 'Transcripción',
    'talks.watch': 'Ver',
    'talks.read': 'Leer',
    'category.liveStream': 'Directos',
    'category.behindTheScenes': 'Tras las cámaras',
    'category.personalTravel': 'Personal y viajes',
    'category.earlyArchive': 'Archivo temprano',

    // Navigation (phase 7: four entries + search)
    'nav.timeline': 'Cronología',
    'nav.people': 'Ellas',

    // Homepage sections
    'home.collecting': 'Recopilando',
    'home.featuredTitle': 'Resonancia del alma',
    'home.featuredSubtitle': 'La complicidad entre ella y ella',
    'home.talkDoor': 'Conversaciones',
    'home.talkDoorHint': 'Otros preguntaron, y luego cortaron.',
    'home.liveDoor': 'Directos',
    'home.liveDoorHint': 'Sin cortes y sin nadie preguntando.',
    'home.talkEntries': '{count} entradas',
    'home.liveEntries': '{count} directos',
    'home.timelineTitle': 'Encontrarlas de nuevo a través del tiempo',
    'home.timelineSubtitle': 'Hay recuerdos que vale la pena revisitar',
    'home.peopleTitle': 'Ellas y las Besties',
    'home.peopleSubtitle': 'Empezó por amar su trabajo. Continúa porque los recuerdos merecen guardarse.',

    // /talks and /live - the two soul-resonance landing pages
    'talks.title': 'Conversaciones',
    'talks.description': 'Entrevistas, variedades y radio.',
    'talks.tabAll': 'Todo',
    'talks.tabInterview': 'Entrevistas',
    'talks.tabVariety': 'Variedades',
    'talks.tabRadio': 'Radio',

    // /dramas - the door for everything they acted in
    'dramas.title': 'Series',
    'dramas.description': 'Series y material relacionado.',
    'dramas.eventCount': '{count} entradas',
    'dramas.viewSeries': 'Abrir la serie',

    // Doors 2-5 (homepage entries with a page of their own)
    'door.description.liveEvents': 'Fan meetings, fiestas de cumpleaños y eventos de marca.',
    'door.description.appearances': 'Premios, semanas de la moda y eventos de empresa.',
    'door.description.commercial': 'Anuncios y publicidad.',
    'door.viewCategory': 'Abrir el estante',
    'door.unfiled': 'Aún sin clasificar',
    'door.video': 'Vídeo',
    'drama.footageCount': '{count} fotogramas y clips',
    'drama.back': 'Volver a series',
    'drama.eventImages': '{count} imágenes',
    'drama.noImages': 'Imágenes en camino',
    'drama.backToEvent': 'Volver a la serie',
    'drama.relatedImages': 'Imágenes relacionadas',
    'drama.watchExternal': 'Ver en la plataforma',
    'drama.watchNote': 'Esta página es la introducción. El visionado ocurre en la plataforma original.',
    'drama.linkPending': 'Enlace de visionado por confirmar',
    'subtype.affair': 'Affair',
    'subtype.harmony_secret': 'Harmony Secret',
    'subtype.hometown_romance': 'Hometown Romance',
    'drama.group.seriesBody': 'La serie',
    'drama.group.premiere': 'Estrenos',
    'drama.group.music': 'Música',
    'drama.group.novel': 'La novela',
    'drama.group.promo': 'Anuncios',
    'drama.group.footage': 'Material',
    'drama.group.award': 'Premios',
    'drama.awardWon': 'Ganado',
    'drama.awardNominated': 'Nominado',
    'live.title': 'Directos',
    'live.description': 'Directos en dúo e individuales.',
    'live.tabAll': 'Todo',
    'live.tabDuo': 'Las dos',

    // Timeline
    'timeline.title': 'Cronología',
    'timeline.description': 'De un día a otro digno de recordar, recorre los años hacia atrás.',
    'timeline.emptyYear': 'La historia de este año aún no se despliega aquí. Con el tiempo se añadirán nuevos hallazgos.',
    'timeline.records': '{count} registros',
    'timeline.unknownDate': 'Sin fecha',

    // People
    'people.title': 'Ellas',
    'people.description': 'Este archivo empezó con ellas, y siguen siendo la razón para seguir reuniendo.',
    'people.relatedProjects': '{count} entradas',
    'people.noProjects': 'Las obras vinculadas a esta persona aún se están reuniendo.',
    'people.birthday': 'Cumpleaños',

    // Project detail
    'project.tabAll': 'Todo',
    'project.tabStills': 'Fotogramas',
    'project.tabBts': 'Tras las cámaras',
    'project.tabPress': 'Prensa y eventos',
    'project.watchNow': 'Ver ahora',
    'project.emptyTitle': 'Aún no hay imágenes en esta categoría.',
    'project.emptyDesc': 'El material nuevo aparece aquí una vez curado.',
    'project.interview': 'Entrevista',
    'project.watchInterview': 'Ver la entrevista',
    'project.cover': 'Portada',
    'project.featured': 'Destacadas',
    'project.unsorted': 'Sin ordenar',
    'project.dateUnknown': 'Fecha desconocida',
    'project.noteStillsTitle': 'Nota de la curadora',
    'project.noteStills':
      'Estos fotogramas seleccionados conservan la textura de la obra y el lenguaje visual que define este proyecto.',
    'project.noteBtsTitle': 'Tras las cámaras',
    'project.noteBts':
      'Momentos entre tomas: el proceso, las risas y el oficio que dan vida a una historia.',
    'project.notePressTitle': 'Prensa y eventos',
    'project.notePress':
      'El camino público: alfombras rojas, ruedas de prensa y la emoción compartida con fans y medios.',

    // Gallery states
    'gallery.emptyAll': 'Aquí aún no hay imágenes. Astra seguirá reuniéndolas con cuidado.',
    'gallery.emptyFiltered': 'Ninguna imagen coincide con este filtro.',
    'gallery.resetFilter': 'Ver todas las imágenes',

    // Projects list states
    'projects.emptyAll': 'Esta página aún toma forma. Más obras llegarán aquí.',
    'projects.photoCount': '{count} imágenes',
    'projects.noImages': 'Aún no hay imágenes del archivo',
    'projects.kindTheme': 'Temas',

    // Sub-class tabs inside a hall. Only halls listed in
    // SUBTYPES_BY_CATEGORY render these, and only when two or more have rows.
    'subtype.concert': 'Conciertos y giras',
    'subtype.fanmeeting': 'Fan meetings',
    'subtype.fansign': 'Fan signs',
    'subtype.brand_event': 'Eventos de marca',
    'subtype.birthday': 'Cumpleaños',
    'subtype.company': 'Eventos de empresa',
    'subtype.awards': 'Premios',
    'subtype.fashion': 'Semanas de la moda',
    'subtype.brand_stage': 'Apariciones de marca',
    'subtype.charity': 'Beneficencia',
    'subtype.industry': 'Sector',
    'subtype.duo': 'Las dos',
    // One name, one shelf: a stream by one of them is hers, not "solo".
    'subtype.lookmhee': 'Lookmhee',
    'subtype.sonya': 'Sonya',

    // Editorial meta
    'editorial.issueCount': '{count} números curados',
    'editorial.releaseDate': 'Fecha de lanzamiento',
    'editorial.artifacts': 'Piezas',
    'editorial.curatorNote': 'Nota de la curadora',
    'editorial.insideIssue': 'Dentro de este número',
    'editorial.pagesPreserved': '{count} páginas conservadas',
    'editorial.pagesEmpty': 'Este número aún no tiene páginas digitalizadas.',
    'editorial.pagesEmptyHint': 'Las páginas aparecen aquí una vez curadas.',
    'editorial.noCover': 'Sin portada',
    'editorial.dateTbd': 'Fecha por confirmar',
    'editorial.loading': 'Cargando',

    // Features door (/features) - special topics rack
    'features.title': 'Especiales',
    'features.subtitle': 'Temas especiales',
    'features.viewIssue': 'Ver tema',
    'features.artifacts': 'Piezas',
    'features.noCover': 'Sin portada',
    'features.emptyTitle': 'Aún no hay temas disponibles',
    'features.emptyDesc': 'Los temas especiales aparecerán aquí una vez publicados.',
    'features.issueCount': '{count} temas curados',
    'features.dateTbd': 'Fecha por confirmar',
    'features.releaseDate': 'Fecha de lanzamiento',
    'features.curatorNote': 'Nota de la curadora',
    'features.pagesEmpty': 'Este tema aún no tiene imágenes digitalizadas.',
    'features.pagesEmptyHint': 'Las imágenes aparecen aquí una vez curadas.',
    'features.insideIssue': 'Dentro de este tema',
    'features.pagesPreserved': '{count} imágenes conservadas',

    // Live-events timeline (level 2 shelf)
    'live.allPhotos': 'Todas las fotos',
    'live.viewAll': 'Ver todo',

    // Chronicle empty state helper
    'chronicle.tryAnotherYear': 'Prueba con otro año:',

    // Homepage CTAs
    'home.explore': 'Explorar',
    'home.enterArchive': 'Entrar al archivo',
    'home.storyContinues': 'La historia continúa',

    // Copyright Page
    'copyright.title': 'Política de derechos de autor',
    'copyright.subtitle': 'Respetando a los creadores, conservando recuerdos',
    'copyright.intro': 'lmsy.space es un proyecto de fans sin ánimo de lucro dedicado a conservar y compartir los momentos hermosos de Lookmhee y Sonya con sus fans de todo el mundo.',
    'copyright.disclaimerTitle': 'Aviso de derechos de autor',
    'copyright.disclaimerText': 'Todo el contenido multimedia (imágenes, vídeos, artículos, etc.) mostrado en este sitio pertenece a sus respectivos propietarios, incluidas —sin limitarse a— las productoras, revistas, fotógrafos y canales oficiales. No reclamamos la propiedad de ningún material protegido.',
    'copyright.fairUseTitle': 'Uso justo',
    'copyright.fairUseText': 'El contenido se comparte con fines educativos y de archivo, para documentar la carrera y el camino artístico de Lookmhee y Sonya. Creemos que esto constituye un uso justo según la Sección 107 de la Ley de Copyright.',
    'creditTitle': 'Créditos y atribución',
    'creditText': 'Nos esforzamos por dar la atribución adecuada a todo el contenido. Siempre que es posible, acreditamos a fotógrafos, publicaciones y fuentes. Si detectas créditos ausentes o incorrectos, contáctanos.',
    'copyright.contactTitle': 'Reclamaciones por infracción de derechos de autor',
    'copyright.contactText': 'Si eres titular de derechos y crees que algún contenido infringe tus derechos, contáctanos con la siguiente información:',
    'copyright.contactItem1': '• Tu nombre y datos de contacto',
    'copyright.contactItem2': '• Descripción de la obra protegida',
    'copyright.contactItem3': '• Ubicación del contenido que infringe (URL)',
    'copyright.contactItem4': '• Declaración de buena fe',
    'copyright.contactEmail': 'Correo de contacto:',
    'copyright.responseTime': 'Respondemos a las reclamaciones válidas en un plazo de 48 horas y retiramos o atribuimos correctamente el contenido.',
    'copyright.backHome': 'Volver al inicio',

    // Página Acerca de
    'about.title': 'Acerca de',
    'about.whatTitle': 'Qué es este sitio',
    'about.whatText1':
      'LMSY Fan Archive es un archivo no oficial hecho por fans del dúo GL tailandés LMSY: Lookmhee Punyapat Wangpongsathaporn y Sonya Saranphat Pedersen.',
    'about.whatText2':
      'Este sitio es un esfuerzo de recopilación: fotos, editoriales de revista, eventos y registros se organizan en un archivo navegable, con cada entrada catalogada por fecha y fuente.',
    'about.disclaimerTitle': 'Aviso de no oficialidad',
    'about.disclaimerText':
      'Este sitio lo mantiene Astra y no está afiliado ni conectado con LMSY, su agencia (CHANGE2561) ni con ningún club de fans oficial.',
    'about.contactTitle': 'Derechos de autor y contacto',
    'about.contactText1':
      'Todas las fotografías y contenidos pertenecen a sus respectivos titulares de derechos. Las imágenes se acreditan a sus fuentes originales siempre que es posible y se presentan aquí únicamente con fines de archivo y aprecio.',
    'about.contactText2':
      'Si eres titular de derechos y deseas que se retire algo o que se acredite de otra forma, escríbenos:',
    'about.seeAlso': 'Ver también: ',

    // Site-level copy (root layout metadata, loading state)
    'site.description': 'Archivo de fans del dúo GL tailandés LMSY (Lookmhee & Sonya), protagonistas de la serie Affair. Perfiles, galería, proyectos y agenda al día.',
    'site.keywords': 'LMSY, Lookmhee, Sonya, Affair, GL tailandés, girls love, drama tailandés, serie Affair',
    'site.loading': 'Cargando el archivo',
    // Door meta descriptions (SEO snippets) — see en.ts for the note.
    'meta.about': 'Sobre LMSY Fan Archive: un archivo no oficial hecho por fans del dúo GL tailandés LMSY (Lookmhee & Sonya).',
    'meta.appearances': 'Premios, semanas de la moda, escenarios de marca, eventos de empresa: cada vez que Lookmhee & Sonya salieron y se las vio.',
    'meta.commercial': 'Campañas, embajadurías y piezas de marca que hicieron Lookmhee & Sonya, guardadas aquí con las fotos que hay detrás.',
    'meta.copyright': 'lmsy.space es un proyecto de fans sin ánimo de lucro, dedicado a conservar y compartir los momentos hermosos de Lookmhee & Sonya con sus fans de todo el mundo.',
    'meta.dramas': 'Todas las historias que han contado Lookmhee & Sonya, en un solo lugar: las series, su música, las novelas detrás de ellas, los anuncios y los premios.',
    'meta.editorial': 'Cada número de revista y publicación en el que han aparecido Lookmhee & Sonya, con sus portadas y sus páginas.',
    'meta.features': 'Temas especiales fuera de las puertas habituales: colecciones de fotos por tema, con sus portadas y sus páginas.',
    'meta.gallery': 'Todas las fotos del archivo: editoriales de revista, publicidad, escenario y stills, con navegación y filtros por etiqueta.',
    'meta.live': 'Los directos que abrieron Lookmhee & Sonya: sin cortes, sin entrevistador, lo más cerca de oírlas hablar por su cuenta.',
    'meta.liveEvents': 'Fan meetings, noches de marca y cumpleaños: cada sala donde estuvieron Lookmhee & Sonya, guardada en fotos.',
    'meta.people': 'Las dos personas alrededor de las cuales está hecho este archivo.',
    'meta.schedule': 'La agenda de Lookmhee & Sonya, lo que viene y lo que pasó: eventos, emisiones y apariciones.',
    'meta.talks': 'Entrevistas, programas de variedades y radio: cada vez que alguien les preguntó a Lookmhee & Sonya y publicó la respuesta.',
    'meta.timeline': 'Cada registro con fecha del archivo, ordenado por cuándo ocurrió de verdad.',

};
