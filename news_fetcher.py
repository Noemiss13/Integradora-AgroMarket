# news_fetcher.py
import feedparser
from googletrans import Translator

translator = Translator()

def fetch_and_cache(rss_url):
    feed = feedparser.parse(rss_url)
    noticias = []

    for entry in feed.entries:
        titulo = entry.title
        descripcion = getattr(entry, 'description', '')  # algunos feeds no tienen descripción
        url = entry.link
        imagen = getattr(entry, 'media_content', [{'url': ''}])[0]['url'] if hasattr(entry, 'media_content') else ''

        # Traducir al español
        titulo_es = translator.translate(titulo, dest='es').text
        descripcion_es = translator.translate(descripcion, dest='es').text if descripcion else ''

        noticias.append({
            "titulo": titulo_es,
            "descripcion": descripcion_es,
            "url": url,
            "imagen": imagen
        })

    return noticias
