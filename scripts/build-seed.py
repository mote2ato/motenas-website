"""Generate seed/seed.json (content model + initial content).

Run: python3 scripts/build-seed.py
The seed is applied only to an empty database, so editing it later does not
change a site that is already set up.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
_key = 0


def k() -> str:
    global _key
    _key += 1
    return f"k{_key:04d}"


def span(text: str, marks: list[str] | None = None) -> dict:
    s = {"_type": "span", "_key": k(), "text": text}
    if marks:
        s["marks"] = marks
    return s


def p(text: str, style: str = "normal") -> dict:
    return {"_type": "block", "_key": k(), "style": style, "markDefs": [], "children": [span(text)]}


def li(text: str) -> dict:
    b = p(text)
    b["listItem"] = "bullet"
    b["level"] = 1
    return b


def labeled(label: str, text: str) -> dict:
    return {
        "_type": "block",
        "_key": k(),
        "style": "normal",
        "markDefs": [],
        "listItem": "bullet",
        "level": 1,
        "children": [span(label, ["strong"]), span("　" + text)],
    }


STR = lambda slug, label, **kw: {"slug": slug, "label": label, "type": "string", **kw}  # noqa: E731
TEXT = lambda slug, label, **kw: {"slug": slug, "label": label, "type": "text", **kw}  # noqa: E731

collections = [
    {
        "slug": "pages",
        "label": "固定ページ",
        "labelSingular": "固定ページ",
        "urlPattern": "/{slug}",
        "supports": ["drafts", "revisions", "preview", "search", "seo"],
        "fields": [
            STR("title", "タイトル", required=True, searchable=True),
            STR("title_en", "英字タイトル（大見出し）"),
            TEXT("lead", "リード文", searchable=True),
            {"slug": "facts", "label": "項目と内容（会社概要・アクセスの表）", "type": "repeater",
             "validation": {"maxItems": 30, "subFields": [
                 STR("label", "項目", required=True),
                 TEXT("value", "内容（改行可）", required=True),
             ]}},
            {"slug": "content", "label": "本文", "type": "portableText", "searchable": True},
        ],
    },
    {
        "slug": "services",
        "label": "事業内容",
        "labelSingular": "事業",
        "supports": ["drafts", "revisions"],
        "fields": [
            STR("title", "事業名", required=True, searchable=True),
            STR("title_en", "英字名"),
            {"slug": "sort_order", "label": "表示順（小さい順）", "type": "integer", "required": True},
            TEXT("summary", "概要", required=True, searchable=True),
            {"slug": "items", "label": "サービス内容", "type": "repeater",
             "validation": {"maxItems": 12, "subFields": [
                 STR("name", "サービス名", required=True),
                 TEXT("description", "説明"),
             ]}},
            {"slug": "outcomes", "label": "期待できる効果", "type": "repeater",
             "validation": {"maxItems": 12, "subFields": [
                 STR("name", "効果", required=True),
                 TEXT("description", "説明"),
             ]}},
        ],
    },
    {
        "slug": "news",
        "label": "お知らせ",
        "labelSingular": "お知らせ",
        "urlPattern": "/news/{slug}",
        "supports": ["drafts", "revisions", "preview", "scheduling", "search", "seo"],
        "fields": [
            STR("title", "タイトル", required=True, searchable=True),
            {"slug": "content", "label": "本文", "type": "portableText", "searchable": True},
        ],
    },
    {
        "slug": "posts",
        "label": "ブログ",
        "labelSingular": "ブログ記事",
        "urlPattern": "/blog/{slug}",
        "supports": ["drafts", "revisions", "preview", "scheduling", "search", "seo"],
        "fields": [
            STR("title", "タイトル", required=True, searchable=True),
            {"slug": "featured_image", "label": "アイキャッチ画像", "type": "image"},
            TEXT("excerpt", "抜粋（一覧に表示）"),
            {"slug": "content", "label": "本文", "type": "portableText", "searchable": True},
        ],
    },
]

taxonomies = [
    {
        "name": "category",
        "label": "カテゴリー",
        "labelSingular": "カテゴリー",
        "hierarchical": True,
        "collections": ["posts"],
        "terms": [
            {"slug": "ai", "label": "AI活用"},
            {"slug": "business", "label": "新規事業"},
            {"slug": "startup", "label": "起業"},
        ],
    }
]

menus = [
    {
        "name": "primary",
        "label": "メインナビゲーション",
        "items": [
            {"type": "custom", "label": "会社案内", "url": "/about"},
            {"type": "custom", "label": "事業内容", "url": "/service"},
            {"type": "custom", "label": "お知らせ", "url": "/news"},
            {"type": "custom", "label": "ブログ", "url": "/blog"},
            {"type": "custom", "label": "アクセス", "url": "/access"},
            {"type": "custom", "label": "お問い合わせ", "url": "/contact", "cssClasses": "button"},
        ],
    }
]

ADDRESS = "〒330-0802\n埼玉県さいたま市大宮区宮町1-5 銀座ビル7階\nコワーキングスペース7F内"

pages = [
    {
        "id": "page-about", "slug": "about", "status": "published",
        "data": {
            "title": "会社案内",
            "title_en": "About",
            "lead": "「もてなす」という社名には、日本の伝統的な「おもてなし」の精神が込められています。",
            "content": [
                p("社名の由来と理念", "h2"),
                p("「おもてなし」の語源は、「表裏なし」（表裏のない気持ちでお客様を迎える）と、「モノを持って成し遂げる」（物や気持ちを用いて目的を達成する）という2つの意味があります。"),
                p("私たちは、この精神を大切にし、クライアントのニーズに真摯に向き合い、最適なソリューションを提供することを使命としています。"),
            ],
            "facts": [
                {"label": "会社名", "value": "株式会社もてなす"},
                {"label": "英文社名", "value": "motenas.inc"},
                {"label": "所在地", "value": "〒330-0802\n埼玉県さいたま市大宮区宮町1-5 銀座ビル7階"},
                {"label": "設立", "value": "2012年（平成24年）10月26日"},
                {"label": "資本金", "value": "2,000,000円"},
                {"label": "代表取締役", "value": "阿藤 大介"},
                {"label": "事業内容", "value": "起業コンサルティング\n・事業計画書の作成支援\n・資金調達のアドバイス\n・法人設立手続きのサポート\n・マーケティング戦略の立案\n・営業・集客方法のアドバイス\n・その他、起業に関する各種サポート"},
                {"label": "過去の協業実績企業", "value": "世界的エンターテインメント企業\n大手不動産ホスピタリティ企業\n国内大手放送局\nソーシャルゲーム開発企業\n国内大手IT企業\n出版業界のリーディングカンパニー\nモバイルサービスのリーディングカンパニー\nほか（順不同）"},
            ],
        },
    },
    {
        "id": "page-service", "slug": "service", "status": "published",
        "data": {
            "title": "事業内容",
            "title_en": "Service",
            "lead": "株式会社もてなすでは、以下の事業を行っております。",
            "content": [
                p("さあ、あなたの次の一歩を踏み出しましょう。", "h2"),
                p("「もてなす」のサービスが、あなたのビジネスを新しい高みに引き上げます。お気軽にお問い合わせください。無料相談を実施中です。"),
            ],
        },
    },
    {
        "id": "page-access", "slug": "access", "status": "published",
        "data": {
            "title": "アクセス",
            "title_en": "Access",
            "lead": "JR大宮駅東口から徒歩1分です。",
            "facts": [
                {"label": "本社所在地", "value": ADDRESS},
                {"label": "TEL", "value": "03-4530-9588"},
                {"label": "FAX", "value": "03-6779-5945"},
                {"label": "受付時間", "value": "10:00〜19:00（土・日・祝日を除く）"},
                {"label": "最寄駅", "value": "JR大宮駅東口 徒歩1分"},
            ],
        },
    },
    {
        "id": "page-contact", "slug": "contact", "status": "published",
        "data": {
            "title": "お問い合わせ",
            "title_en": "Contact",
            "lead": "起業に関するご質問やご相談、無料相談、メディアからの取材・インタビューのご依頼など、お気軽にご連絡ください。",
            "content": [
                p("確認画面は出ませんので、送信前にもう一度内容をお確かめください。お名前とメールアドレスは必須項目です。"),
            ],
        },
    },
]

services = [
    {
        "id": "service-startup", "slug": "startup-consulting", "status": "published",
        "data": {
            "title": "起業コンサルティング業務",
            "title_en": "Startup Consulting",
            "sort_order": 1,
            "summary": "起業を目指す方々に対し、ビジネスアイデアの具体化から事業計画の策定、資金調達、マーケティング戦略の立案まで、総合的なサポートを提供します。",
            "items": [
                {"name": "ビジネスアイデアの具体化", "description": "お客様のアイデアを市場性や実現可能性の観点から分析し、具体的な事業計画に落とし込みます。"},
                {"name": "事業計画策定支援", "description": "成功するための事業計画書の作成をサポートし、投資家や金融機関へのアピール力を高めます。"},
                {"name": "資金調達サポート", "description": "最適な資金調達方法の選定や、投資家との交渉を支援します。"},
                {"name": "マーケティング戦略立案", "description": "市場分析に基づき、効果的なマーケティング戦略を共に構築します。"},
            ],
        },
    },
    {
        "id": "service-coaching", "slug": "motivation-coaching", "status": "published",
        "data": {
            "title": "モチベーション形成コーチング",
            "title_en": "Motivation Coaching",
            "sort_order": 2,
            "summary": "個人や組織のモチベーション向上を専門としたコーチングサービスを提供します。目標達成や自己実現に向けて、内なる意欲を引き出し、持続的なやる気をサポートします。",
            "items": [
                {"name": "自己分析と目標設定", "description": "クライアントの価値観や強みを明確にし、達成可能な目標を共に設定します。"},
                {"name": "モチベーション維持の技術提供", "description": "日常生活や業務において、モチベーションを高め、維持するための具体的な方法やツールを提供します。"},
                {"name": "定期的なフィードバックと調整", "description": "進捗状況を定期的に確認し、必要に応じてアプローチの修正や新たな目標設定を行います。"},
            ],
            "outcomes": [
                {"name": "生産性の向上", "description": "高いモチベーションを維持することで、業務効率や成果が向上します。"},
                {"name": "自己成長の促進", "description": "内なる意欲を引き出すことで、継続的な自己成長が可能となります。"},
                {"name": "組織全体の活性化", "description": "個々のモチベーション向上が、チームや組織全体の活力につながります。"},
            ],
        },
    },
    {
        "id": "service-ai", "slug": "ai-adoption", "status": "published",
        "data": {
            "title": "AI導入支援サービス",
            "title_en": "AI Adoption",
            "sort_order": 3,
            "summary": "企業の業務効率化や新規事業開発に向け、AI技術の導入を総合的にサポートします。",
            "items": [
                {"name": "AI活用コンサルティング", "description": "業務課題の分析から、最適なAIソリューションの提案までを行います。"},
                {"name": "AIツール導入支援", "description": "既存のAIツールの選定やカスタマイズ、導入後の運用サポートを提供します。"},
                {"name": "AI人材育成", "description": "社内でのAI活用を推進するための人材育成プログラムを提供します。"},
            ],
        },
    },
    {
        "id": "service-design", "slug": "design", "status": "published",
        "data": {
            "title": "起業・新規事業向けデザイン業務",
            "title_en": "Design",
            "sort_order": 4,
            "summary": "起業や新規事業に必要なデザイン業務を提供します。ロゴ、名刺、ホームページ、ランディングページなど、業務始動時に必要なビジュアル要素を設計し、実現します。",
            "items": [
                {"name": "ロゴ設計、ブランディング", "description": "企業やプロジェクトのブランドアイデンティティを初歩から構築します。"},
                {"name": "名刺、プリント物", "description": "プロフェッショナルな印刷物の設計を通じて、他社との差別化を図ります。"},
                {"name": "ホームページ、ランディングページ", "description": "最適化されたデジタルコンテンツを通じて、オンラインプレゼンスを高めます。"},
            ],
        },
    },
]

news = [
    {
        "id": "news-renewal", "slug": "website-renewal", "status": "published",
        "data": {
            "title": "WEBサイトをリニューアルしました",
            "content": [
                p("このたび、株式会社もてなすのWEBサイトをリニューアルしました。"),
                p("今後は「お知らせ」と「ブログ」で、最新情報やAI活用・新規事業に関する知見を発信してまいります。引き続きよろしくお願いいたします。"),
            ],
        },
    }
]

posts = [
    {
        "id": "post-ai-cases", "slug": "ai-efficiency-cases", "status": "draft",
        "data": {
            "title": "AI活用による業務効率化の成功事例",
            "excerpt": "AI技術の導入で、業務プロセスの改善やコスト削減、作業時間の短縮を実現した事例を紹介します。",
            "content": [
                p("AI技術の導入は、多くの企業で業務効率化に成功しています。"),
                p("例えば、ある企業ではAIを活用したデータ分析により、業務プロセスの改善やコスト削減を実現しました。また、別の企業ではAIによる自動化ツールの導入で、作業時間を大幅に短縮し、生産性を向上させています。"),
                p("これらの事例は、AI技術が業務効率化において大きな効果を発揮することを示しています。"),
            ],
        },
        "taxonomies": {"category": ["ai"]},
    }
]

seed = {
    "$schema": "https://emdashcms.com/seed.schema.json",
    "version": "1",
    "meta": {
        "name": "株式会社もてなす",
        "description": "株式会社もてなす コーポレートサイト",
        "author": "株式会社もてなす",
    },
    "settings": {
        "title": "株式会社もてなす",
        "tagline": "AIを入れる前に、やるべきことがある。成果につながる“仕組み”を、設計から定着まで。",
        "timezone": "Asia/Tokyo",
        "seo": {"titleSeparator": "|"},
    },
    "collections": collections,
    "taxonomies": taxonomies,
    "menus": menus,
    "content": {"pages": pages, "services": services, "news": news, "posts": posts},
}

out = ROOT / "seed" / "seed.json"
out.write_text(json.dumps(seed, ensure_ascii=False, indent="\t") + "\n", encoding="utf-8")
print(f"wrote {out}")
