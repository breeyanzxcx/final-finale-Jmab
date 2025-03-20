document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const addAddressModal = document.getElementById('addAddressModal');
    const confirmationModal = document.getElementById('confirmationModal');
    const addButton = document.querySelector('.add-button');
    const closeButton = document.querySelector('.close-button');
    const addressForm = document.getElementById('addressForm');
    const addressesContainer = document.getElementById('addressesContainer');
    const deleteAddressButton = document.getElementById('deleteAddressButton');
    const confirmDeleteButton = document.getElementById('confirmDeleteButton');
    const cancelDeleteButton = document.getElementById('cancelDeleteButton');
    const citySelect = document.getElementById('city');
    const barangaySelect = document.getElementById('barangay');

    let currentAddressId = null;

    // Cities/Municipalities list
    const cities = [
        "Alaminos City", "Dagupan City", "San Carlos City", "Urdaneta City", "Agno", "Aguilar",
        "Alcala", "Anda", "Asingan", "Balungao", "Bani", "Basista", "Bautista", "Bayambang",
        "Binalonan", "Binmaley", "Bolinao", "Bugallon", "Burgos", "Calasiao", "Dasol", "Infanta",
        "Labrador", "Laoac", "Lingayen (Capital)", "Mabini", "Malasiqui", "Manaoag", "Mangaldan",
        "Mangatarem", "Mapandan", "Natividad", "Pozorrubio", "Rosales", "San Fabian", "San Jacinto",
        "San Manuel", "San Nicolas", "San Quintin", "Santa Barbara", "Santa Maria", "Santo Tomas",
        "Sison", "Sual", "Tayug", "Umingan", "Urbiztondo", "Villasis"
    ];

    // Barangays data (your provided list)
    const barangays = {
        "Agno": ["Allabon", "Aloleng", "Bangan-Oda", "Baruan", "Bobo", "Cayawan", "Dangley", "Gayusan", "Macaboboni", "Magsaysay", "Namatucan", "Patar", "Poblacion East", "Poblacion West", "San Juan", "Tupa", "Viga"],
        "Aguilar": ["Balaybuaya", "Bantayan", "Bayaoas", "Baybay", "Bucao", "Calsib", "Laoag", "Manlocboc", "Nipaya", "Pangaridan", "Poblacion", "Pogonsili", "San Jose", "Tampac"],
        "Alaminos City": ["Amandiego", "Amangbangan", "Balangobong", "Balayang", "Bisocol", "Bolaney", "Bued", "Cabaruan", "Cayucay", "Dulacac", "Inerangan", "Landoc", "Linmansangan", "Lucap", "Maawi", "Macatiw", "Magsaysay", "Maliga", "Mona", "Palamis", "Pandan", "Pangapisan", "Poblacion", "Pocalpocal", "Pogo", "Polo", "Quibuar", "Sabangan", "San Antonio", "San Jose", "San Roque", "San Vicente", "Santa Maria", "Tanaytay", "Tangcarang", "Tawintawin", "Telbang", "Victoria", "Viga"],
        "Alcala": ["Amandiego", "Anulid", "Bersamin", "Canarvacanan", "Caranglaan", "Curareng", "Gualsic", "Kisikis", "Laoac", "Macayo", "Pindangan Centro", "Pindangan East", "Pindangan West", "Poblacion East", "Poblacion West", "San Juan", "San Nicolas", "San Pedro Apartado", "San Pedro IlI", "San Vicente", "Vacante"],
        "Anda": ["Awag", "Awile", "Batiarao", "Cabungan", "Carot", "Dolaoan", "Imbo", "Macaleeng", "Macandocandong", "Mal-ong", "Namagbagan", "Poblacion", "Roxas", "Sablig", "San Jose", "Siapar", "Tondod", "Tondol", "Toritori"],
        "Asingan": ["Aristotle", "Bantog", "Baro", "Bobonan", "Cabaritan", "Cabueldatan", "Calepaan", "Carosucan Norte", "Carosucan Sur", "Coldit", "Domanpot", "Domanoan", "Dupac", "Macalong", "Palaris", "Poblacion East", "Poblacion West", "San Vicente East", "San Vicente West", "Sanchez", "Sobrante", "Toboy"],
        "Balungao": ["Angayan Norte", "Angayan Sur", "Capulaan", "Esmeralda", "Kita-Kita", "Mabini", "Mauban", "Poblacion", "Pugaro", "Rajal", "San Andres", "San Aurelio 1st", "San Aurelio 2nd", "San Joaquin", "San Julian", "San Leon", "San Marcelino", "San Miguel", "San Raymundo"],
        "Bani": ["Ambabaay", "Aporao", "Arwas", "Ballag", "Banog Norte", "Banog Sur", "Calabeng", "Centro Toma", "Colayo", "Dacap Norte", "Dacap Sur", "Garrita", "Luac", "Macabit", "Masidem", "Poblacion", "Quinaoayanan", "Ranom Iloco", "San Jose", "San Miguel", "San Simon", "Tiep", "Tipor", "Tugui Grande", "Tugui Norte"],
        "Basista": ["Anambongan", "Bayoyong", "Cabeldatan", "Dumpay", "Malimpec East", "Mapolopolo", "Nalneran", "Obong", "Osmeña Sr.", "Palma", "Poblacion"],
        "Bautista": ["Artacho", "Baluyot", "Cabuaan", "Cacandongan", "Diaz", "Ketegan", "Nandacan", "Nibaliw Norte", "Nibaliw Sur", "Palanlang", "Poblacion East", "Poblacion West", "Primicias", "Sinabaan", "Vacante", "Villanueva"],
        "Bayambang": ["Alinggan", "Amancosiling Norte", "Amancosiling Sur", "Amamperez", "Amuang", "Bacnono", "Balaybuaya", "Banaban", "Bani", "Batangcaoa", "Beleng", "Bical Norte", "Bical Sur", "Buayaen", "Buenlag 1st", "Buenlag 2nd", "Cadre Site", "Caturay", "Darawey", "Duera", "Dusoc", "Hermosa", "Idong", "Inanlorenza", "Inirangan", "Langiran", "Ligue", "Macayocayo", "Magsaysay", "Maigpa", "Malimpec", "Malioer", "Managos", "Manambong Norte", "Manambong Parte", "Manambong Sur", "Mangayao", "Nalsian Norte", "Nalsian Sur", "Pangdel", "Pantol", "Paragos", "Poblacion Sur", "Pugo", "Reynado", "San Gabriel 1st", "San Gabriel 2nd", "San Vicente", "Sangcagulis", "Sapang", "Sioasio East", "Sioasio West", "T Cocson", "Tamaro", "Tambac", "Tampog", "Tanolong", "Tatarao", "Telbang", "Warding", "Wawa", "Zone I", "Zone II", "Zone III", "Zone IV", "Zone V", "Zone VI", "Zone VII"],
        "Binalonan": ["Balangay", "Bued", "Bugayong", "Camangaan", "Canarvacanan", "Capas", "Cili", "Dumarayos", "Linmansangan", "Mangcasuy", "Moreno", "Pasileng Norte", "Pasileng Sur", "Poblacion", "San Felipe Central", "San Felipe Sur", "San Pablo", "Santa Catalina", "Santiago", "Santo Niño", "Sumabnit", "Tabuyoc", "Vacante"],
        "Binmaley": ["Amancoro", "Balagan", "Balogo", "Basing", "Baybay Lopez", "Baybay Lino", "Biec", "Buenlag", "Calit", "Calsib", "Camaley", "Dulag", "Gayaman", "Linoc", "Lomboy", "Malindong", "Manat", "Nagpalangan", "Naguilayan", "Pallas", "Poblacion", "Sabangan", "Salapingao", "San Isidro Norte", "San Isidro Sur", "Santa Rosa", "Tombor"],
        "Bolinao": ["Arnedo", "Balingasay", "Binabalian", "Catuday", "Catungi", "Concordia", "Culang", "Dewey", "Estanza", "Germinal", "Goyoden", "Ilogmalino", "Lambes", "Liwa-liwa", "Lucero", "Luciente 1st", "Luciente 2nd", "Luna", "Patpat", "Pilar", "Poblacion", "Ranao", "Sampaloc", "San Isidro", "Tara", "Tupa", "Zaragoza"],
        "Bugallon": ["Angarian", "Asinan", "Bañaga", "Bolaoen", "Buenlag", "Cabayaoasan", "Cayanga", "Gueset", "Hacienda", "Laguit Centro", "Laguit Padilla", "Magtaking", "Pangascasan", "Poblacion", "Polong", "Portic", "Salomague Norte", "Salomague Sur", "San Francisco", "San Jose", "San Miguel", "Socony", "Umanday", "Urdaneta"],
        "Burgos": ["Anapao", "Cacayasen", "Concordia", "Don Matias", "Ilio-ilio", "Papallasen", "Poblacion", "Pogoruac", "San Miguel", "San Pascual", "San Vicente", "Sapa Grande", "Sapa Pequeña", "Tambacan"],
        "Calasiao": ["Ambonao", "Ambuetel", "Banaoang", "Bued", "Buenlag", "Cabilocaan", "Dinalaoan", "Doyong", "Gabon", "Lasip", "Longos", "Lumbang", "Macabito", "Malabago", "Mancup", "Nagsaing", "Poblacion East", "Poblacion West", "Quesban", "San Miguel", "San Vicente", "Songkoy", "Talibaew", "Wawa"],
        "Dagupan City": ["Bacayao Norte", "Bacayao Sur", "Barangay I", "Barangay II", "Barangay III", "Barangay IV", "Bolosan", "Bonuan Binloc", "Bonuan Boquig", "Bonuan Gueset", "Calmay", "Carael", "Caranglaan", "Herrero-Perez", "Lasip Chico", "Lasip Grande", "Lomboy", "Lucao", "Malued", "Mamalingling", "Mangin", "Mayombo", "Pantal", "Poblacion Oeste", "Pogo Chico", "Pogo Grande", "Pugaro Suit", "Salapingao", "Salisay", "Tambac", "Tebeng"],
        "Dasol": ["Alegria", "Alilao", "Amalbalan", "Bobonot", "Esguerra", "Gais-Guipe", "Hermosa", "Macalang", "Magsaysay", "Malacapas", "Malimpin", "Osmeña", "Petal", "Poblacion", "San Vicente", "Tambobong", "Tambac", "Uli", "Viga"],
        "Infanta": ["Bamban", "Batang", "Bayambang", "Cato", "Doliman", "Fatima", "Maya", "Nangalisan", "Nayom", "Pita", "Poblacion", "Potol"],
        "Labrador": ["Bolo", "Bongalon", "Dulig", "Laois", "Magsaysay", "Poblacion", "San Gonzalo", "San Jose", "Tobuan", "Uyong"],
        "Laoac": ["Anis", "Bagumbayan", "Balligi", "Banuar", "Botique", "Cabilaoan", "Caaringayan", "Calaoagan", "Calmay", "Casampagaan", "Casanestebanan", "Casanti", "Caturay", "Domingo Alarcio", "Inamotan", "Lebueg", "Maraboc", "Panan", "Poblacion", "Taloy", "Turko"],
        "Lingayen (Capital)": ["Aliwekwek", "Baay", "Balangobong", "Balococ", "Bantayan", "Basing", "Capandanan", "Domalandan Center", "Domalandan East", "Domalandan West", "Dorongan", "Dulag", "Estanza", "Lasip", "Libsong East", "Libsong West", "Malawa", "Malimpuec", "Maniboc", "Matique", "Matalava", "Naguelguel", "Namolan", "Pangapisan North", "Pangapisan Sur", "Poblacion", "Quibaol", "Rosario", "Sabangan", "Tonton", "Tumbar", "Wawa"],
        "Mabini": ["Bacnit", "Baguen", "Barlo", "Caabiangaan", "Cabanaetan", "Cabaruan", "Cabarvan", "Calzada", "Caranglaan", "De Guzman", "Luna", "Magalong", "Nibasaan", "Patacbo", "Poblacion", "San Pedro", "Tagudin", "Villacorta"],
        "Malasiqui": ["Abonagan", "Agdao", "Alacan", "Aliaga", "Amacalan", "Anolid", "Apaya", "Asin Este", "Asin Weste", "Bacundao Este", "Bacundao Weste", "Bakas", "Bakitiw", "Balite", "Banawang", "Barang", "Bawer", "Binalay", "Bobon", "Bolaoit", "Bongar", "Butao", "Cabatling", "Cabueldatan", "Calbueg", "Canan", "Carmen", "Don Pedro", "Gatang", "Goliman", "Gomez", "Guilig", "Ican", "Ingalagala", "Lareg-lareg", "Lasip", "Lepa", "Loqueb Este", "Loqueb Norte", "Loqueb Sur", "Lunec", "Mabulitec", "Malimpec", "Mangga", "Nalsian Norte", "Nalsian Sur", "Nansangaan", "Osmeña", "Pacuan", "Palapar Norte", "Palapar Sur", "Palong", "Pamaran", "Pasima", "Payar", "Poblacion", "Polong Norte", "Polong Sur", "Potiocan", "San Julian", "Tabo-Sili", "Talospatang", "Taloy", "Tambac", "Tobor", "Tolngan", "Tomling", "Umando", "Viado", "Waig", "Warey"],
        "Manaoag": ["Babasit", "Baguinay", "Baritao", "Bolosan", "Bucao", "Cabanbanan", "Calocaan East", "Calocaan West", "Inamotan", "Lelemaan", "Licsi", "Lipit", "Matolong", "Mermer", "Nalsian", "Oraan East", "Oraan West", "Pantal", "Pao", "Parian", "Poblacion", "Pugaro", "San Ramon", "Santa Ines", "Sapang", "Tebuel"],
        "Mangaldan": ["Alitaya", "Amansabina", "Anolid", "Banaoang", "Bantayan", "Bari", "Bateng", "Buenlag", "David", "Embarcadero", "Gueguesangen", "Guesang", "Guilig", "Guinobatan", "Inlambo", "Lanas", "Landas", "Maasin", "Macayug", "Malabago", "Navaluan", "Nibaliw", "Osiem", "Palua", "Poblacion", "Pogo", "Salaan", "Salay", "Serafica", "Tebag"],
        "Mangatarem": ["Andangin", "Arellano Street", "Bantay", "Bantocaling", "Bogtong Bolo", "Bogtong Bunao", "Bogtong Centro", "Bogtong Niog", "Bogtong Silag", "Bolo", "Buaya", "Buenlag", "Bueno", "Bunagan", "Bunlalacao", "Burgos Street", "Cabaruan", "Cabatuan", "Cabayaoasan", "Cabayawasan", "Cacabugaoan", "Calomboyan Norte", "Calomboyan Sur", "Calvo", "Casilagan", "Catarataraan", "Caturay Norte", "Caturay Sur", "Caviernesan", "Dorongan Ketaket", "Dorongan Linmansangan", "Dorongan Maragul", "Dorongan Punta", "Dorongan Sawat", "Dorongan Valerio", "General Luna", "Historia", "Lawaga", "Lawak", "Linmansangan", "Lopez", "Luis", "Macarang", "Malabobo", "Malibong", "Maliwalo", "Muelang", "Naguilayan East", "Naguilayan West", "Niog-Cabison", "Olegario-Caoile", "Olo Cacamposan", "Olo Cafabrosan", "Olo Cagarlitan", "Osmeña Sr.", "Pacalat", "Pampano", "Parian", "Peania Pedania", "Pogon-Aniat", "Pogon-Lomboy", "Ponglo-Baleg", "Ponglo-Muelang", "Quezon", "Salavante", "Sapang", "Sonson Ongkit", "Suaco", "Tagac", "Takipan", "Talogtog", "Tococ Barikir", "Torre 1st", "Torre 2nd", "Zamora"],
        "Mapandan": ["Amanoaoac", "Apaya", "Aserda", "Baloling", "Coral", "Golden", "Jimenez", "Lambayan", "Luyan", "Nilombot", "Pias", "Poblacion", "Primicias", "Santa Maria", "Torres"],
        "Natividad": ["Batchelor East", "Batchelor West", "Burgos", "Cacandungan", "Calapugan", "Canarem", "Luna", "Poblacion East", "Poblacion West", "Rizal", "San Antonio", "San Eugenio", "San Macario", "San Miguel", "San Modesto", "Silag"],
        "Pozorrubio": ["Alipangpang", "Amagbagan", "Balacag", "Banding", "Bantugan", "Bobonan", "Buneg", "Cablong", "Casanfernandoan", "Castaño", "Dilan", "Don Benito", "Haway", "Imbalbalatong", "Inoman", "Laoac", "Maambal", "Malasin", "Malokiat", "Manaol", "Nandacan", "Palacpalac", "Poblacion I", "Poblacion II", "Poblacion III", "Poblacion IV", "Rosario", "Sugcong", "Talogtog", "Villegas"],
        "Rosales": ["Acop", "Bakit-Bakit", "Balingcanaway", "Cabalaoangan Norte", "Cabugaoan", "Calanutan", "Camangaan", "Captain Tomas", "Carmen East", "Carmen West", "Casanicolasan", "Coliling", "Don Antonio", "Pangaoan", "Poblacion", "Rabago", "Rizal", "Salvacion", "San Antonio", "San Bartolome", "San Isidro", "San Luis", "San Pedro", "San Vicente", "Station District", "Tomana East", "Tomana West", "Zone I", "Zone II", "Zone III", "Zone IV", "Zone V"],
        "San Carlos City": ["Abanon", "Abas", "Agdao", "Anando", "Ano", "Antipangol", "Aponit", "Bacnar", "Balaya", "Balayong", "Baldog", "Balite Sur", "Balocawehay", "Bani", "Bocboc", "Bogaoan", "Bolibol", "Buenglat", "Bugallon-Posadas Street", "Burgos-Padlan", "Cacaritan", "Caingal", "Calobaoan", "Calobasa", "Camanang", "Candido", "Caoayan-Kiling", "Capataan", "Cobol", "Coliling", "Cruz", "Doyong", "Gamata", "Guelew", "Ilang", "Inerangan", "Isla", "Libas", "Lilimasan", "Longos", "Lucban", "M. Soriano", "Mabini", "Magtaking", "Malacañang", "Maliwara", "Mamarla", "Manat", "Manga", "Manzon", "Matagdem", "Mestizo Norte", "Naguilayan", "Nelintap", "Padilla-Gomez", "Pagal", "Paitan", "Palaming", "Pangalangan", "Pangoloan", "Pangpang", "Parayao", "Payapa", "Perez Boulevard", "PNR Site", "Polo", "Quezon Boulevard", "Quintong", "Rizal", "Roxas Boulevard", "Salinap", "San Juan", "San Pedro", "Sapinit", "Supo", "Talang", "Taloy", "Tamayo", "Tampac", "Tandang Sora", "Tandoc", "Tarece", "Tarectec", "Tayambani", "Tebag", "Turac", "Wallace"],
        "San Fabian": ["Ambalangan-Dalin", "Angio", "Anonang", "Aramal", "Bigbiga", "Binday", "Bolaoen", "Bolasi", "Cabaroan", "Cayanga", "Colisao", "Gomgot", "Gotongan", "Inmalog", "Lipit-Tomeeng", "Longos", "Longos Proper", "Longos-Amangonan-Parac-Parac", "Nibaliw Central", "Nibaliw East", "Nibaliw Magliba", "Nibaliw Narvarte", "Nibaliw Vidal", "Palapad", "Poblacion", "Rabon", "Sagud-Bahley", "San Fabian", "Tempra-Guilig", "Tocok"],
        "San Jacinto": ["Awai", "Bagong Pag-asa", "Bolo", "Capaoay", "Casibong", "Guibel", "Imelda", "Labney", "Lobong", "Macayug", "Magsaysay", "San Guillermo", "San Jose", "San Juan", "San Roque", "San Vicente", "Santa Cruz", "Santa Maria", "Santo Domingo", "Poblacion East", "Poblacion West"],
        "San Manuel": ["Assumption", "Botobot Norte", "Botobot Sur", "Cabaritan", "Cabaruan", "Flores", "Lapalo", "Nagsaag", "Narra", "San Antonio-Arzadon", "San Bonifacio", "San Juan", "San Roque", "San Vicente", "Santo Domingo", "Poblacion"],
        "San Nicolas": ["Bensican", "Caboan", "Cabuloan", "Calanutian", "Calawaan", "Camangaan", "Camindoroan", "Casaratan", "Dalumpinas", "Fianza", "Lungao", "Malico", "Malilion", "Nagrebcan", "Nining", "Poblacion East", "Poblacion West", "Salpad", "San Felipe East", "San Felipe West", "San Isidro", "San Jose", "San Rafael", "San Roque", "Santa Maria East", "Santa Maria West", "Santo Tomas", "Sibleng", "Sobol"],
        "San Quintin": ["Alac", "Bantog", "Bolintaguen", "Cabangaran", "Cabayaoasan", "Calomboyan", "Carayacan", "Casilagan", "Gonzalo", "Labuan", "Lagasan", "Mantacdang", "Nangapugan", "Poblacion Zone I", "Poblacion Zone II", "Poblacion Zone III", "San Pedro", "Ungib"],
        "Santa Barbara": ["Alibago", "Balanay", "Balingueo", "Banaoang", "Banzal", "Botao", "Carusocan", "Dalongue", "Erfe", "Gueguesangen", "Leet", "Malunec", "Maningding", "Marunong", "Maticmatic", "Minien East", "Minien West", "Nilombot", "Patayac", "Payas", "Poblacion Norte", "Poblacion Sur", "Primicias", "Sapang", "Sonquil", "Tebag East", "Tebag West", "Tuliao", "Ventoso"],
        "Santa Maria": ["Bal-lo", "Bantog", "Barraca", "Bauang", "Cabaroan", "Cal-litang", "Capandanan", "Dalayap", "Libsong", "Namagbagan", "Pataquid", "Pilar", "Poblacion East", "Poblacion West", "Pugot", "Samon", "San Gabriel", "San Mariano", "San Pablo", "San Patricio", "San Vicente", "Santa Cruz", "Santa Rosa"],
        "Santo Tomas": ["La Luna", "Poblacion East", "Poblacion West", "Salvacion", "San Agustin", "San Antonio", "San Jose", "San Marcos", "San Matias", "Santo Domingo", "Santo Niño"],
        "Sison": ["Agat", "Alibeng", "Amagbagan", "Artemio T. Mamale", "Asan Norte", "Asan Sur", "Bantay Insik", "Bila", "Binmeckeg", "Bulaoen East", "Bulaoen West", "Bulldog", "Cabaritan", "Calunetan", "Camangaan", "Cayungnan", "Dungon", "Esperanza", "Killo", "Labayug", "Paldit", "Pindangan", "Pinmilapil", "Poblacion Central", "Poblacion Norte", "Poblacion Sur", "Sagunto", "Tara-tara"],
        "Sual": ["Baay", "Bolinao", "Caboayan", "Calumbuyan", "Camagsingalan", "Caoayan", "Capantolan", "Macaycayawan", "Paitan", "Pangascasan", "Poblacion", "Santo Domingo", "Seselangen", "Sioasio Este", "Sioasio Oeste", "Victoria"],
        "Tayug": ["Aguinaldo", "Amistad", "Bacayao", "Barangobong", "Carriedo", "C. Lichauco", "Evangelista", "Guzon", "Legaspi", "Libertad", "Magallanes", "Panganiban", "Poblacion A", "Poblacion B", "Poblacion C", "Poblacion D", "Saleng", "Santo Domingo", "Toketec", "Zamora"],
        "Umingan": ["Abot", "Alo-o", "Amaronan", "Annas", "Bantug", "Baracbac", "Buenavista", "Cabalitian", "Cabaruan", "Cabatuan", "Calitlitan", "Carayungan Sur", "Carosalesan", "Caurdanetaan", "Concepcion", "Deco", "Diaz", "Diket", "Don Justo Abalos", "Don Montano", "Esperanza", "Evangelista", "Flores", "Fulgosino", "Gonzales", "La Paz", "Labuan", "Lauren", "Lubing", "Luna Este", "Luna Weste", "Maseil-seil", "Nampalcan", "Pangangaan", "Papallasen", "Pemienta", "Poblacion East", "Poblacion West", "Prado", "Resurreccion", "Ricos", "San Andres", "San Juan", "San Leon", "San Pablo", "San Vicente", "Santa Maria", "Santa Rosa", "Santo Domingo", "Tanggal Sawang"],
        "Urbiztondo": ["Angatel", "Balangay", "Batangcaoa", "Bayaoas", "Bituag", "Camambugan", "Dalangiring", "Duplac", "Galarin", "Gueteb", "Malaca", "Malayo", "Malibong", "Pasiling", "Pisuac", "Poblacion", "Real", "Salavante", "San Jose", "Saw Wat"],
        "Urdaneta City": ["Alexander", "Anonas", "Bactad East", "Bactad Proper", "Bayaoas", "Bolaoen", "Cabaruan", "Cabuloan", "Camantiles", "Camantiles East", "Casantaan", "Catablan", "Cayambanan", "Consolacion", "Dilan-Paurido", "Labit Proper", "Labit West", "Mabanogbog", "Macalong", "Nancalobasaan", "Nancamaliran East", "Nancamaliran West", "Nancayasan", "Oltama", "Palina East", "Palina West", "Pinmaludpod", "Poblacion", "San Jose", "San Vicente", "Santa Lucia", "Santo Domingo", "Sugcong", "Tabuyoc", "Tipuso", "Tulong", "Anonas East", "Anonas West", "Bactad West", "Cabaruan East", "Cabaruan West", "Camantiles West", "Casantaan East", "Casantaan West", "Catablan East", "Catablan West", "Labit East", "Nancalobasaan East", "Nancalobasaan West", "Nancayasan East", "Nancayasan West", "Palina", "San Vicente East", "San Vicente West"],
        "Villasis": ["Amamperez", "Bacag", "Bacundao East", "Bacundao West", "Baran", "Barraca", "Capulaan", "Caramutan", "Carmen", "Labit", "Lipat", "Lomboy", "Piaz", "Poblacion Zone I", "Poblacion Zone II", "Poblacion Zone III", "Puelay", "San Blas", "San Nicolas", "Tombod", "Unzad"]
    };

    // Populate city dropdown
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        citySelect.appendChild(option);
    });

    // Update barangay dropdown based on city selection
    citySelect.addEventListener('change', function() {
        const selectedCity = this.value;
        barangaySelect.innerHTML = '<option value="">Select Barangay</option>';

        if (selectedCity && barangays[selectedCity]) {
            barangays[selectedCity].forEach(barangay => {
                const option = document.createElement('option');
                option.value = barangay;
                option.textContent = barangay;
                barangaySelect.appendChild(option);
            });
        }
    });

    // Toggle profile dropdown
    window.toggleDropdown = function() {
        const dropdown = document.getElementById('profileDropdown');
        dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
    }

    // Show modal for adding new address
    addButton.addEventListener('click', () => {
        document.getElementById('modalTitle').textContent = 'ADD ADDRESS';
        addressForm.reset();
        document.getElementById('province').value = 'Pangasinan';
        document.getElementById('addressId').value = '';
        citySelect.value = '';
        barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
        deleteAddressButton.style.display = 'none';
        addAddressModal.style.display = 'block';
    });

    // Close modal
    closeButton.addEventListener('click', () => {
        addAddressModal.style.display = 'none';
    });

    // Fetch and display addresses
    async function fetchAddresses() {
        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('authToken');

        try {
            const response = await fetch(`http://localhost/jmab/final-jmab/api/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success && data.user) {
                displayAddresses(data.user.addresses || []);
            } else {
                console.error('Invalid response format:', data);
                displayAddresses([]);
            }
        } catch (error) {
            console.error('Error fetching addresses:', error);
            displayAddresses([]);
        }
    }

    // Display addresses in the container
    function displayAddresses(addresses) {
        addressesContainer.innerHTML = '';
        if (addresses.length === 0) {
            addressesContainer.innerHTML = '<p>No addresses found.</p>';
            return;
        }

        addresses.forEach(address => {
            const addressElement = document.createElement('div');
            addressElement.className = 'address-item';
            addressElement.innerHTML = `
                <div class="address-details">
                    <p><strong>${address.home_address}</strong></p>
                    <p>${address.barangay}, ${address.city}, Pangasinan</p>
                    ${address.is_default === 1 ? '<span class="default-tag">Default</span>' : ''}
                </div>
                <button class="edit-button" data-id="${address.id}">Edit</button>
            `;
            addressesContainer.appendChild(addressElement);

            const editButton = addressElement.querySelector('.edit-button');
            editButton.addEventListener('click', () => editAddress(address.id));
        });
    }

    // Handle form submission (add or update)
    addressForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('authToken');
        const addressId = document.getElementById('addressId').value;
        const isDefault = document.getElementById('setDefault').checked ? 1 : 0;

        let currentAddresses = [];
        try {
            const response = await fetch(`http://localhost/jmab/final-jmab/api/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success && data.user) {
                currentAddresses = data.user.addresses || [];
            }
        } catch (error) {
            console.error('Error fetching current addresses:', error);
        }

        const addressData = {
            home_address: document.getElementById('street').value,
            barangay: document.getElementById('barangay').value,
            city: document.getElementById('city').value,
            province: "Pangasinan",
            is_default: isDefault
        };

        let updatedAddresses;
        if (addressId) {
            addressData.id = addressId;
            updatedAddresses = currentAddresses.map(addr => {
                if (addr.id == addressId) {
                    return addressData;
                }
                return {
                    ...addr,
                    is_default: isDefault ? 0 : addr.is_default
                };
            });
        } else {
            updatedAddresses = [...currentAddresses];
            if (isDefault) {
                updatedAddresses = updatedAddresses.map(addr => ({
                    ...addr,
                    is_default: 0
                }));
            }
            updatedAddresses.push(addressData);
        }

        const payload = {
            addresses: updatedAddresses
        };

        try {
            console.log('Sending update payload:', JSON.stringify(payload, null, 2));
            const response = await fetch(`http://localhost/jmab/final-jmab/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                addAddressModal.style.display = 'none';
                await fetchAddresses();
                console.log('Address updated successfully');
            } else {
                const errorText = await response.text();
                console.error('Failed to update address:', errorText);
                showNotificationPopup('Failed to update address: ' + errorText);
            }
        } catch (error) {
            console.error('Error updating address:', error);
            showNotificationPopup('Error updating address: ' + error.message);
        }
    });

    // Edit specific address
    async function editAddress(addressId) {
        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('authToken');

        try {
            const response = await fetch(`http://localhost/jmab/final-jmab/api/users/${userId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.success && data.user) {
                const address = data.user.addresses.find(addr => addr.id == addressId);
                if (address) {
                    document.getElementById('modalTitle').textContent = `EDIT ADDRESS`;
                    document.getElementById('street').value = address.home_address || '';
                    document.getElementById('city').value = address.city || '';

                    // Update barangay dropdown based on selected city
                    barangaySelect.innerHTML = '<option value="">Select Barangay</option>';
                    if (barangays[address.city]) {
                        barangays[address.city].forEach(barangay => {
                            const option = document.createElement('option');
                            option.value = barangay;
                            option.textContent = barangay;
                            if (barangay === address.barangay) {
                                option.selected = true;
                            }
                            barangaySelect.appendChild(option);
                        });
                    }

                    document.getElementById('setDefault').checked = address.is_default === 1;
                    document.getElementById('addressId').value = address.id;
                    deleteAddressButton.style.display = 'block';
                    currentAddressId = address.id;
                    addAddressModal.style.display = 'block';
                } else {
                    console.error(`Address with ID ${addressId} not found`);
                    showNotificationPopup(`Address with ID ${addressId} not found`);
                }
            } else {
                console.error('Invalid response format:', data);
                showNotificationPopup('Failed to load address data');
            }
        } catch (error) {
            console.error('Error fetching address for edit:', error);
            showNotificationPopup('Error loading address: ' + error.message);
        }
    }

    // Delete specific address
    async function deleteAddress(addressId) {
        const userId = localStorage.getItem('userId');
        const token = localStorage.getItem('authToken');

        const payload = {
            address_ids: [addressId]
        };

        console.log('Attempting to delete address with ID:', addressId);
        console.log('Delete payload:', JSON.stringify(payload, null, 2));

        try {
            const response = await fetch(`http://localhost/jmab/final-jmab/api/users/${userId}/addresses`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            const responseText = await response.text();
            console.log('Delete response status:', response.status);
            console.log('Delete response body:', responseText);

            if (response.ok) {
                console.log(`Address ${addressId} deleted successfully`);
                confirmationModal.style.display = 'none';
                addAddressModal.style.display = 'none';
                await fetchAddresses();
            } else {
                console.error('Failed to delete address:', responseText);
                showNotificationPopup('Failed to delete address: ' + responseText);
            }
        } catch (error) {
            console.error('Error deleting address:', error);
            showNotificationPopup('Error deleting address: ' + error.message);
        }
    }

    // Delete address button click
    deleteAddressButton.addEventListener('click', () => {
        confirmationModal.style.display = 'block';
    });

    // Confirm delete
    confirmDeleteButton.addEventListener('click', () => {
        if (currentAddressId) {
            deleteAddress(currentAddressId);
        } else {
            console.error('No address ID selected for deletion');
            showNotificationPopup('No address selected to delete');
        }
    });

    // Cancel delete
    cancelDeleteButton.addEventListener('click', () => {
        confirmationModal.style.display = 'none';
    });

    // Initial fetch of addresses
    fetchAddresses();

    // Notification popup function
    function showNotificationPopup(message, callback = null) {
        const popup = document.getElementById("notificationPopup");
        const messageElement = document.getElementById("notificationMessage");
        const okButton = document.getElementById("notificationOkBtn");

        messageElement.textContent = message;
        popup.style.display = "flex";

        okButton.onclick = function() {
            popup.style.display = "none";
            if (callback) callback();
        };
    }
});