// A small conversation that imitates claude.ai's markup. Used by the Node
// tests and by dev/harness.html. Update it when claude.ai's markup changes.
globalThis.FIXTURE_HTML = `
<main>
  <div><div data-testid="user-message"><p class="whitespace-pre-wrap break-words">Write a Python script that loads TEC data from a CSV and plots it against time.
Columns: time, tec</p></div></div>

  <div data-is-streaming="false"><div class="font-claude-response">
    <p>Here's <code>analysis.py</code>:</p>
    <div><pre class="code-block__code"><div class="lang-label">python</div><button>Copy</button><code class="language-python">import pandas as pd

df = pd.read_csv("tec.csv", parse_dates=["time"])
print(df.head())</code></pre></div>
  </div></div>

  <div><div data-testid="user-message"><p class="whitespace-pre-wrap">Add a running mean.</p></div></div>

  <div data-is-streaming="false"><div class="font-claude-response">
    <p>Updated <strong>analysis.py</strong> with a 30-minute running mean <span class="katex"><span class="katex-mathml"><math><semantics><annotation encoding="application/x-tex">\\bar{x}</annotation></semantics></math></span><span class="katex-html" aria-hidden="true">x̄</span></span>:</p>
    <div><pre><button>Copy</button><code class="language-python">import pandas as pd

df = pd.read_csv("tec.csv", parse_dates=["time"])
df["tec_mean"] = df["tec"].rolling("30min", on="time").mean()</code></pre></div>
    <p>Install the dependency first:</p>
    <pre><code class="language-bash">pip install pandas</code></pre>
  </div></div>

  <div><div data-testid="user-message"><p class="whitespace-pre-wrap">Now make a separate plotting module.</p></div></div>

  <div data-is-streaming="false"><div class="font-claude-response">
    <pre><code class="language-python"># file: plot_tec.py
import matplotlib.pyplot as plt

def plot(df):
    plt.plot(df["time"], df["tec"])</code></pre>
    <table><thead><tr><th>Column</th><th>Unit</th></tr></thead>
      <tbody><tr><td>tec</td><td>TECU</td></tr><tr><td>tec_mean</td><td>TECU</td></tr></tbody></table>
  </div></div>

  <div><div data-testid="user-message"><p class="whitespace-pre-wrap">The x-axis labels overlap.</p></div></div>

  <div data-is-streaming="false"><div class="font-claude-response">
    <p>Two options:</p>
    <ol>
      <li>Rotate the labels with <code>fig.autofmt_xdate()</code>
        <ul><li>works for most plots</li></ul>
      </li>
      <li>Use a <em>concise</em> date formatter</li>
    </ol>
    <span class="katex-display"><span class="katex"><span class="katex-mathml"><math><semantics><annotation encoding="application/x-tex">\\mathrm{TEC} = \\int n_e \\, ds</annotation></semantics></math></span><span class="katex-html" aria-hidden="true">TEC</span></span></span>
  </div></div>

  <div><div data-testid="user-message"><p class="whitespace-pre-wrap">Also add storm-time shading.</p></div></div>

  <div data-is-streaming="false"><div class="font-claude-response">
    <p>Updated plot_tec.py:</p>
    <pre><code class="language-python">import matplotlib.pyplot as plt

def plot(df, storm=None):
    fig, ax = plt.subplots()
    ax.plot(df["time"], df["tec"])
    if storm:
        ax.axvspan(*storm, alpha=0.2)
    fig.autofmt_xdate()
    return fig</code></pre>
    <blockquote><p>Pass <code>storm=(start, end)</code> as datetimes.</p></blockquote>
  </div></div>

  <div role="alert">You've reached your usage limit. Your limit will reset at 3:00 PM.</div>
</main>
`;
