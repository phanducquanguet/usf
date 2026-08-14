/**
 * Skip path: "Connect a runtime to start with Mika".
 *
 * Written to a new issue (assigned to the user themselves) by the welcome
 * hook when the user took the Skip exit on Step 3. Content is the
 * install-runtime tutorial; each supported locale can recommend the
 * quickest runtime path that best fits that audience.
 *
 * Title is stable — kept identical to the v2 server-side
 * `NoRuntimeIssueTitle` so any existing dedupe code elsewhere keeps
 * matching by title.
 */

/**
 * Localized so users see the title in their current supported locale on the
 * board. The Runtimes page owns the follow-up Mika bootstrap once a runtime
 * appears, so this guide does not ask the member to copy an agent prompt.
 *
 * Note: server's deprecation shim (`onboarding_shim.go:noRuntimeIssueTitle`)
 * still uses the bare English string for its title-based dedupe — that
 * codepath only runs for pre-v3 desktop builds and never overlaps with
 * the v3 frontend population, so the two title-spaces drifting is fine.
 */
export const INSTALL_RUNTIME_ISSUE_TITLE = {
  en: "Connect a runtime to start with Mika",
  zh: "连接运行时，和 Mika 开始",
  ko: "runtime을 연결하고 Mika와 시작하기",
  ja: "runtime を接続して Mika と始める",
  vi: "Kết nối runtime để bắt đầu cùng Mika",
} as const;

const en = `Welcome to UniAI.

Agents need a runtime before they can execute work. You can still use UniAI as a lightweight project-management workspace while you install one.

## Try UniAI first

Before the runtime is ready, you can:

1. Create a project for your current work.
2. Create a few issues and move them across backlog, todo, in_progress, and done.
3. Add priorities, labels, comments, and subscriptions.
4. Use Inbox to track assignments and mentions.

That gives you the project-management layer first. Once a runtime is connected, agents can start working from the same issues.

## Install your first agent runtime

Full guide: open **Help** in the app and read "Install AI coding tools".

For English users, the fastest first path is Codex:

1. Make sure Node.js is installed.
2. Install Codex:
   npm i -g @openai/codex
3. Sign in:
   codex
4. Confirm your terminal can find it:
   which codex
   codex --version
5. Wait for UniAI to pick it up. A running daemon re-checks for newly
   installed CLIs every couple of minutes, so no restart is normally needed.
   To apply it immediately:
   uniai daemon restart
   In the desktop app, open any local runtime and click Restart. Quitting and
   reopening the app is NOT enough — the daemon keeps running in the background.
6. Return to Runtimes and refresh. You should see a Codex runtime online.
7. Open Runtimes. The page will offer **Start with Mika**; use it to create Mika and open the guided first chat.

Codex reference: https://developers.openai.com/codex/cli

Mika will turn one real goal into an issue, start it with the right agent, and suggest reusable specialists when your workflow needs them.`;

const zh = `欢迎来到 UniAI。

智能体需要先连上运行时才能执行工作。运行时还没准备好时,你也可以先把 UniAI 当作轻量项目管理工具体验起来。

## 先体验项目管理功能

运行时安装前,你可以先做这些事:

1. 为当前工作创建一个项目。
2. 新建几个任务,并在 backlog、todo、in_progress、done 之间流转。
3. 给任务加优先级、标签、评论和订阅。
4. 用收件箱追踪分配给你的事项和 @mention。

这样你先熟悉项目管理层。连上运行时后,智能体会直接在这些任务上开始工作。

## 安装第一个 Agent 运行时

完整文档:打开应用内的 **帮助**,查看 "Install AI coding tools" 页面。

中文用户建议先装 Kimi CLI:

1. 在 macOS / Linux 终端安装 Kimi CLI:
   curl -LsSf https://code.kimi.com/install.sh | bash
   Windows PowerShell:
   Invoke-RestMethod https://code.kimi.com/install.ps1 | Invoke-Expression
2. 确认终端能找到 Kimi:
   kimi --version
3. 在你想让 Kimi 工作的项目目录里启动一次:
   kimi
4. 首次启动后输入 /login,按提示完成 Kimi Code 或 API key 配置。
5. 等 UniAI 识别到它。运行中的守护进程每隔几分钟会重新检查一次新装的 CLI,通常不需要重启。
   想立刻生效:
   uniai daemon restart
   桌面端请打开任意一个本机 runtime 并点 Restart。退出再打开 app 是不够的 —— 守护进程会继续在后台运行。
6. 回到 Runtimes 页面刷新。你应该能看到一个在线的 Kimi 运行时。
7. 打开"运行时"页面。页面会显示 **和 Mika 开始**；点击后会创建 Mika，并进入引导式的首次对话。

Kimi CLI 官方文档:https://moonshotai.github.io/kimi-cli/zh/guides/getting-started.html

Mika 会把一个真实目标转化为任务，交给合适的智能体启动执行，并在工作流需要时建议添加可复用的 specialist。`;

const ko = `UniAI에 오신 것을 환영합니다.

agent가 작업을 실행하려면 먼저 runtime이 필요합니다. runtime을 설치하는 동안에도 UniAI를 가벼운 프로젝트 관리 워크스페이스로 먼저 사용할 수 있습니다.

## 먼저 UniAI를 사용해 보기

runtime이 준비되기 전에는 다음을 해볼 수 있습니다:

1. 현재 작업을 위한 project를 만듭니다.
2. 태스크 몇 개를 만들고 backlog, todo, in_progress, done 사이에서 이동해 봅니다.
3. priority, label, comment, subscription을 추가합니다.
4. Inbox에서 나에게 배정된 작업과 mention을 확인합니다.

이렇게 프로젝트 관리 계층을 먼저 익힐 수 있습니다. runtime이 연결되면 agent가 같은 태스크에서 바로 작업을 시작합니다.

## 첫 agent runtime 설치하기

전체 가이드: 앱의 **도움말**을 열고 "Install AI coding tools" 페이지를 확인하세요.

한국어 사용자는 Codex로 시작하는 것이 가장 빠릅니다:

1. Node.js가 설치되어 있는지 확인합니다.
2. Codex를 설치합니다:
   npm i -g @openai/codex
3. 로그인합니다:
   codex
4. 터미널에서 찾을 수 있는지 확인합니다:
   which codex
   codex --version
5. UniAI가 인식할 때까지 기다립니다. 실행 중인 daemon은 몇 분마다 새로 설치된 CLI를
   다시 확인하므로 보통 재시작이 필요하지 않습니다.
   바로 적용하려면:
   uniai daemon restart
   데스크톱 앱에서는 아무 로컬 runtime을 열고 Restart를 누르세요. 앱을 종료하고 다시 여는
   것만으로는 충분하지 않습니다 — daemon은 백그라운드에서 계속 실행됩니다.
6. Runtimes로 돌아가 새로고침합니다. Codex runtime이 online으로 보여야 합니다.
7. Runtimes를 엽니다. **Mika와 시작**을 눌러 Mika를 만들고 안내되는 첫 채팅을 시작합니다.

Codex 참고 문서: https://developers.openai.com/codex/cli

Mika가 실제 목표 하나를 태스크로 만들고 적합한 에이전트와 실행을 시작하며, 워크플로에 필요할 때 재사용 가능한 specialist를 제안합니다.`;

const ja = `UniAI へようこそ。

agent が作業を実行するには、まず runtime が必要です。runtime をインストールしている間も、UniAI を軽量なプロジェクト管理ワークスペースとして先に使うことができます。

## まず UniAI を使ってみる

runtime が準備できる前に、次のことを試せます:

1. いまの仕事のための project を作る。
2. タスクをいくつか作り、backlog、todo、in_progress、done の間で動かしてみる。
3. priority、label、comment、subscription を追加する。
4. Inbox で自分への割り当てや mention を確認する。

これでまずプロジェクト管理のレイヤーに慣れることができます。runtime を接続すると、agent が同じタスクから作業を始められます。

## 最初の agent runtime をインストールする

詳しいガイド: アプリ内の **ヘルプ** を開き、"Install AI coding tools" ページをご覧ください。

日本語ユーザーには、Codex で始めるのが最も速い経路です:

1. Node.js がインストールされていることを確認します。
2. Codex をインストールします:
   npm i -g @openai/codex
3. サインインします:
   codex
4. ターミナルから見つけられるか確認します:
   which codex
   codex --version
5. UniAI が認識するまで待ちます。動作中の daemon は数分ごとに新しくインストールされた
   CLI を再チェックするため、通常は再起動は不要です。
   すぐに反映したい場合:
   uniai daemon restart
   デスクトップアプリではローカル runtime を開いて Restart を押してください。アプリを終了して
   開き直すだけでは不十分です — daemon はバックグラウンドで動き続けます。
6. Runtimes に戻って再読み込みします。Codex runtime が online と表示されるはずです。
7. Runtimes を開き、**Mika と始める**を選びます。Mika が作成され、案内付きの最初のチャットが開きます。

Codex のリファレンス: https://developers.openai.com/codex/cli

Mika は実際の目標を 1 つのタスクにし、適切なエージェントで実行を開始し、ワークフローに必要なときは再利用可能な specialist を提案します。`;

const vi = `Chào mừng đến với UniAI.

Agent cần một runtime trước khi có thể thực thi công việc. Trong lúc cài đặt runtime, bạn vẫn có thể dùng UniAI như một không gian quản lý dự án gọn nhẹ.

## Dùng thử UniAI trước

Trước khi runtime sẵn sàng, bạn có thể:

1. Tạo một dự án cho công việc hiện tại.
2. Tạo vài issue và chuyển chúng qua các trạng thái backlog, todo, in_progress, done.
3. Thêm độ ưu tiên, nhãn, bình luận và theo dõi.
4. Dùng Hộp thư đến để theo dõi việc được giao và các lượt @nhắc.

Như vậy bạn làm quen với lớp quản lý dự án trước. Khi runtime được kết nối, agent sẽ bắt đầu làm việc ngay trên chính các issue đó.

## Cài đặt runtime đầu tiên cho agent

Hướng dẫn đầy đủ: mở nút **Trợ giúp** trong ứng dụng và xem trang "Cài đặt công cụ lập trình AI".

Đường nhanh nhất để bắt đầu là Codex:

1. Đảm bảo đã cài Node.js.
2. Cài Codex:
   npm i -g @openai/codex
3. Đăng nhập:
   codex
4. Xác nhận terminal tìm thấy nó:
   which codex
   codex --version
5. Chờ UniAI nhận diện. Daemon đang chạy sẽ tự kiểm tra lại các CLI mới cài
   sau vài phút, nên thường không cần khởi động lại. Muốn áp dụng ngay:
   uniai daemon restart
   Trong app desktop, mở một runtime cục bộ bất kỳ và bấm Restart. Thoát rồi mở
   lại app là KHÔNG đủ — daemon vẫn chạy nền.
6. Quay lại trang Runtime và tải lại. Bạn sẽ thấy một runtime Codex online.
7. Mở trang Runtime. Trang sẽ hiện **Bắt đầu cùng Mika**; dùng nó để tạo Mika và mở cuộc trò chuyện hướng dẫn đầu tiên.

Tài liệu Codex: https://developers.openai.com/codex/cli

Mika sẽ biến một mục tiêu thực thành issue, khởi động với agent phù hợp, và gợi ý các specialist tái sử dụng được khi quy trình của bạn cần.`;

export const INSTALL_RUNTIME_ISSUE_BODY = { en, zh, ko, ja, vi } as const;
