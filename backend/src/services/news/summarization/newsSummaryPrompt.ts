/**
 * ニュース要約プロンプト生成
 * Task 4.1, 4.2: ニュース要約プロンプト機能
 *
 * 複数のニュース記事を統合し、約2000文字の要約を生成するための
 * プロンプトを構築します。
 *
 * Requirements: 1.4 (複数記事を2000文字に要約), 1.5 (英語記事を日本語に翻訳+要約)
 */

/**
 * ニュース記事の基本構造
 *
 * NewsAPIやGoogle News RSSから取得した記事データを表現します。
 */
export interface NewsArticle {
  /** 記事タイトル */
  title: string;
  /** 記事の簡易説明(オプション) */
  description?: string;
  /** 記事本文(オプション) */
  content?: string;
  /** ニュースソース名 */
  source: string;
  /** 公開日時(ISO 8601形式) */
  publishedAt: string;
}

/**
 * 要約設定
 *
 * 要約文の文字数に関する設定値を保持します。
 */
export const SUMMARY_CONFIG = {
  /** 目標文字数 */
  targetCharacters: 2000,
  /** 最小許容文字数 */
  minCharacters: 1800,
  /** 最大許容文字数 */
  maxCharacters: 2200,
} as const;

/**
 * 記事をフォーマットしてプロンプト用のテキストに変換
 *
 * @param articles - フォーマットする記事の配列
 * @returns フォーマットされた記事テキスト
 */
function formatArticles(articles: NewsArticle[]): string {
  if (articles.length === 0) {
    return '(記事がありません)';
  }

  return articles
    .map((article, index) => {
      const parts = [
        `【記事 ${index + 1}】`,
        `タイトル: ${article.title}`,
        `ソース: ${article.source}`,
        `日時: ${article.publishedAt}`,
      ];

      if (article.description) {
        parts.push(`概要: ${article.description}`);
      }

      if (article.content) {
        parts.push(`本文: ${article.content}`);
      }

      return parts.join('\n');
    })
    .join('\n\n');
}

/**
 * 英語ニュース翻訳・要約プロンプトを生成
 *
 * 複数の英語ニュース記事を統合し、日本語で要約するプロンプトを構築します。
 * 約2000文字の出力を指示します。
 *
 * @param articles - 要約対象の英語ニュース記事配列
 * @returns Claude APIに送信するプロンプト文字列
 */
export function buildEnglishNewsSummaryPrompt(articles: NewsArticle[]): string {
  const formattedArticles = formatArticles(articles);

  return `あなたは投資・金融ニュースの専門家です。以下の英語ニュース記事を日本語に翻訳し、投資家にとって重要なポイントを抽出して要約してください。

## 指示
1. 以下のすべての英語記事を読み、内容を日本語に翻訳してください
2. 投資・金融・経済・市場に関する重要なポイントを抽出してください
3. 複数の記事を統合し、一つの読みやすい要約にまとめてください
4. 要約は約${SUMMARY_CONFIG.targetCharacters}文字(${SUMMARY_CONFIG.minCharacters}〜${SUMMARY_CONFIG.maxCharacters}文字)で作成してください
5. 読者は投資初学者なので、専門用語は簡潔な説明を加えてください
6. 各記事のソース(出典)を適切に言及してください

## 出力形式
- 見出しや箇条書きを適宜使用して読みやすくしてください
- 重要な数値やデータがあれば含めてください
- 最後に今日の市場の全体的な動向をまとめてください

## ニュース記事
${formattedArticles}

日本語で要約を作成してください。`;
}

/**
 * 日本語ニュース要約プロンプトを生成
 *
 * 複数の日本語ニュース記事を統合し、要約するプロンプトを構築します。
 * 約2000文字の出力を指示します。
 *
 * @param articles - 要約対象の日本語ニュース記事配列
 * @returns Claude APIに送信するプロンプト文字列
 */
export function buildJapaneseNewsSummaryPrompt(articles: NewsArticle[]): string {
  const formattedArticles = formatArticles(articles);

  return `あなたは投資・金融ニュースの専門家です。以下の日本のニュース記事を読み、投資家にとって重要なポイントを抽出して要約してください。

## 指示
1. 以下のすべての記事を読み、内容を理解してください
2. 投資・金融・経済・市場に関する重要なポイントを抽出してください
3. 複数の記事を統合し、一つの読みやすい要約にまとめてください
4. 要約は約${SUMMARY_CONFIG.targetCharacters}文字(${SUMMARY_CONFIG.minCharacters}〜${SUMMARY_CONFIG.maxCharacters}文字)で作成してください
5. 読者は投資初学者なので、専門用語は簡潔な説明を加えてください
6. 各記事のソース(出典)を適切に言及してください

## 出力形式
- 見出しや箇条書きを適宜使用して読みやすくしてください
- 重要な数値やデータがあれば含めてください
- 最後に今日の市場の全体的な動向をまとめてください

## ニュース記事
${formattedArticles}

要約を作成してください。`;
}
