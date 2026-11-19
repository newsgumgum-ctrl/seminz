SEMIN ZORANIC · FLIGHT SZ001
Lični sajt, verzija "do jaja": noćni polet iznad grada, prolaz kroz oblake do izlaska
sunca, boarding karta presavijena u 3D papirni avion kroz šest projekata, i na kraju
avion koji se razvije u boarding kartu sa dugmićima "Hire Semin" i "Schedule a call".

STRUKTURA
  index.html          ceo tekst sajta (naslovi, projekti, linkovi)
  styles.css          izgled
  main.js             skrol, natpisi, poglavlja, kapija (gate)
  sky.js              proceduralni "film": grad noću, oblaci, izlazak sunca (WebGL shader)
  product.js          3D papirni avion (Three.js), rotacija mišem, razvijanje u kartu
  props.js            3D predmeti uz tekst: sijalica sa avionom, filmska klapa,
                      laptop i telefon, raketa
                      (na telefonu se bočni predmeti ne prikazuju)
  i18n.js             English / Srpski: svi srpski tekstovi su ovde (SR), engleski je u index.html
  pass.js             crta boarding kartu i avionsku poštu (teksture aviona)
  vendor/three.module.js   Three.js, lokalno, bez CDN-a
  assets/pass.webp    slika boarding karte na kraju (ista kao tekstura aviona)
  assets/fonts/       Instrument Serif + Inter, lokalno

POSTAVLJANJE NA GITHUB (tvoj postojeći sajt newsgumgum-ctrl.github.io/seminz)
  1. Otvori github.com/newsgumgum-ctrl/seminz → Add file → Upload files.
  2. Prevuci SADRŽAJ ovog foldera (sve fajlove i foldere assets i vendor, ne sam folder).
  3. Commit changes. Postojeći index.html se zamenjuje novim.
  4. Za minut-dva sajt je na istoj adresi. Workflow za Pages koji već imaš ostaje isti.

ILI NETLIFY
  app.netlify.com/drop → prevuci ceo folder → Site configuration → promeni ime sajta.

LOKALNO TESTIRANJE
  Ne otvaraj index.html duplim klikom (browser tada blokira JS module).
  U ovom folderu pokreni:  python -m http.server 8000   pa otvori http://localhost:8000

OBILAZAK (AUTOMATSKI)
  Pre ulaska na sajt crni ekran sa Play dugmetom, pa poruka da se ne dodiruje ekran. Sajt tada
  sam skroluje od natpisa do natpisa; kod svakog projekta ostavi vreme za čitanje, pa preko celog
  ekrana pokaže početnu stranu tog sajta i ide dalje (tour.js). Staje čim posetilac skroluje, dodirne
  ekran ili pritisne taster, ili klikne "Stop the tour". Dugme "Play the flight" (na telefonu okruglo dugme gore desno)
ponovo pušta obilazak od mesta gde je posetilac. Sličice sajtova su u assets/previews/.
  Za testiranje bez dugmeta dodaj ?notour na kraj adrese.

JEZIK
  Dugme English / Srpski je u zaglavlju. Izbor se pamti; prva poseta sa srpskim, hrvatskim
  ili bosanskim browserom otvara Srpski. Svaki element sa data-t="tN" u index.html ima svoj
  srpski prevod pod istim ključem u i18n.js. Kad menjaš engleski tekst, promeni i srpski.

IZMENE TEKSTA
  Sve je u index.html: natpisi su u <div class="cap">, projekti u <article class="chapter">
  (svaki ima red Idea / Built / Result i oznake; plave oznake su web i app development).
  Novi projekat dodaš kopiranjem jednog <article class="chapter"> bloka: dužina skrola,
  meni sa brojevima i let aviona se sami prilagode broju projekata. Značku dodaš u PINS u props.js,
  usluge i klijenti u <section class="after">. Linkovi za Hire/Schedule su na kapiji (class="gate")
  i u odeljku "closing".
  3D predmeti prate prazne okvire u stranici (class="cap-prop"), pa se
  njihova veličina i položaj menjaju u styles.css. Značke projekata su u props.js (PINS):
  boja i tekst po obodu. Ako pošalješ prave logoe projekata, mogu da ih ubacim u značke.
  Boarding karta (tekst na kartici) se crta u pass.js. Ako je menjaš, napravi i novu
  assets/pass.webp (javi Claude-u, ili uradi screenshot kartice), da se kraj poklopi.

PRAVI VIDEO UMESTO PROCEDURALNOG NEBA (opciono)
  Sajt radi i bez videa. Ako želiš filmski kadar, napravi 3 klipa u AI video alatu
  (Kling, Runway, Veo, Sora...). Svaki: 5 sekundi, 16:9, 1080p, jedan spor kontinuiran pokret
  kamere, bez rezova i bez teksta, fotorealistično, isto svetlo i kolor.
  Pravi ih u lancu: poslednji kadar klipa 1 je prvi kadar klipa 2 (image-to-video).
  Poslednji kadar izvučeš ovako:  ffmpeg -sseof -0.05 -i clip-1.mp4 -frames:v 1 last.png

  Klip 1 (polet):
    "Night aerial over a small Balkan city, warm sodium street lights forming a dense grid,
     a dark river curving through it, a highway of moving headlights. The camera rises slowly
     from low altitude and tilts up toward the horizon, low clouds lit orange from below by the
     city. Photoreal, cinematic, 35mm, slow continuous drone move, no cuts, no text."
  Klip 2 (kroz oblake):
    "Continuing the climb from the previous frame: the camera rises into a thick cloud deck at
     pre-dawn, soft grey-blue mist streaming past the lens, layers of cloud rushing downward,
     first warm light appearing ahead. Photoreal, slow continuous upward move, no cuts, no text."
  Klip 3 (iznad oblaka):
    "The camera breaks out above a vast sea of clouds at sunrise, a low golden sun on the horizon,
     violet-blue shadows in the cloud valleys, warm rim light on the cloud tops. Slow forward
     glide, horizon level, ends calm and centered on the sun. Photoreal, no cuts, no text."

  Kodiranje za glatko skrolovanje (za svaki klip):
    ffmpeg -i in.mp4 -an -vf scale=1920:-2 -c:v libx264 -preset veryfast -crf 24 -g 8 -bf 0 -pix_fmt yuv420p -movflags +faststart assets/clip-1.mp4
  Zatim u index.html, na <div class="film" id="film" data-clips="">, upiši:
    data-clips="assets/clip-1.mp4,assets/clip-2.mp4,assets/clip-3.mp4"
  Sajt tada skroluje kroz video, a 3D avion i kapija rade isto kao sada.

PRISTUPAČNOST I REZERVE
  Bez WebGL-a: nebo postaje gradijent, avion se ne prikazuje, svi tekstovi i karta ostaju.
  "Reduce motion" u sistemu: bez zanošenja i preleta, svi projekti sa leve strane.
  Avion se okreće mišem, prstom (levo-desno) ili strelicama kada je fokusiran.
