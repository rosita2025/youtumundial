<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="robots" content="noindex"/>
        <title>Youtumundial — XML Sitemap</title>
        <style>
          :root { color-scheme: light; }
          body { margin:0; padding:2rem 1.25rem; font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; background:#fafafa; color:#18181b; }
          .wrap { max-width: 1040px; margin: 0 auto; }
          h1 { font-size: 1.5rem; margin: 0 0 .35rem; letter-spacing:-.02em; }
          p.sub { margin: 0 0 1.5rem; color:#71717a; font-size:.9rem; }
          table { width:100%; border-collapse:collapse; background:#fff; border:1px solid #e4e4e7; border-radius:10px; overflow:hidden; }
          th, td { text-align:left; padding:.65rem .85rem; font-size:.875rem; border-bottom:1px solid #f1f1f4; }
          th { background:#f4f4f5; font-weight:600; color:#3f3f46; text-transform:uppercase; font-size:.72rem; letter-spacing:.05em; }
          tr:last-child td { border-bottom:none; }
          td a { color:#0f62fe; text-decoration:none; word-break:break-all; }
          td a:hover { text-decoration:underline; }
          .num { color:#a1a1aa; width:3rem; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h1>Youtumundial — XML Sitemap</h1>
          <p class="sub">
            <xsl:value-of select="count(s:urlset/s:url)"/> URLs. This file is for search engines; the styling below is only to make it readable.
          </p>
          <table>
            <tr>
              <th class="num">#</th>
              <th>URL</th>
              <th>Change freq.</th>
              <th>Priority</th>
            </tr>
            <xsl:for-each select="s:urlset/s:url">
              <tr>
                <td class="num"><xsl:value-of select="position()"/></td>
                <td>
                  <a href="{s:loc}"><xsl:value-of select="s:loc"/></a>
                </td>
                <td><xsl:value-of select="s:changefreq"/></td>
                <td><xsl:value-of select="s:priority"/></td>
              </tr>
            </xsl:for-each>
          </table>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
