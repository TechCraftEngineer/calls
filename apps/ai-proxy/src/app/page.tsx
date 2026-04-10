export default function Home() {
  return (
    <main style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>AI Proxy</h1>
      <p>Прокси для OpenRouter. Деплой на Vercel.</p>
      <section style={{ marginTop: "1.5rem" }}>
        <h2>Эндпоинты</h2>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li>
            <strong>OpenRouter</strong> — <code>/api/openrouter/...</code> (chat completions)
          </li>
        </ul>
        <p style={{ marginTop: "0.5rem", color: "#666", fontSize: "0.9rem" }}>
          Обратная совместимость: <code>/api/chat/completions</code> → OpenAI
        </p>
      </section>
    </main>
  );
}
