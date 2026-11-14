import type { Locale } from '@/common/i18n';

/**
 * Тексты формы турнира: проверки полей, совет по группам, схема турнира,
 * подсказка о равенстве очков.
 *
 * Не в общих словарях — по той же причине, что `format-texts.ts`: ru и kk
 * грузятся в набор консоли судьи, а он упирается в бюджет 420 КБ gzip
 * (ТС 8.1, ADR-086). Полноту языков стережёт `Record<Locale, …>`.
 */
export interface FormCheckText {
  readonly startsRequired: string;
  readonly startsPast: string;
  readonly regAfterStart: string;
  readonly regPast: string;
  readonly ratingBounds: string;
  readonly birthBounds: string;
  readonly maxParticipants: string;
  readonly summary: string;
  readonly required: string;
  readonly participants: string;
  readonly participantsHint: string;
  readonly adviceGroups: string;
  readonly adviceApply: string;
  readonly adviceApplied: string;
  readonly adviceRoundRobin: string;
  readonly adviceSmall: string;
  readonly adviceSwitch: string;
  readonly structureTitle: string;
  readonly structureOpen: string;
  readonly group: string;
  readonly advanceNote: string;
  readonly bracket: string;
  readonly exitBracket: string;
  readonly finalGroup: string;
  readonly everyone: string;
  readonly players: string;
  readonly final: string;
  readonly tieBreakHelp: string;
}

export const FORM_CHECK_TEXTS: Readonly<Record<Locale, FormCheckText>> = {
  ru: {
    startsRequired: 'Укажите дату и время начала',
    startsPast: 'Это время уже прошло — выберите будущее',
    regAfterStart: 'Запись должна закрыться не позже начала турнира',
    regPast: 'Это время уже прошло',
    ratingBounds: '«Не ниже» больше, чем «не выше»',
    birthBounds: '«Не раньше» позже, чем «не позже»',
    maxParticipants: 'Хотя бы 2 участника',
    summary: 'Турнир не создан — исправьте поля, отмеченные красным: {count}',
    required: 'обязательное поле',
    participants: 'Сколько ждёте участников',
    participantsHint:
      'Примерно. По этому числу считаются встречи и подбираются группы, в турнир оно не сохраняется',
    adviceGroups:
      'Для {n} участников подойдёт: {groups} групп по {sizes}, из каждой выходят {advance}',
    adviceApply: 'Подобрать',
    adviceApplied: 'Группы подобраны под {n} участников',
    adviceRoundRobin:
      'Круговая на {n} участников — это {matches} встреч. Для такого состава удобнее «Группы и сетка»',
    adviceSmall: 'Для {n} участников группы не нужны — хватит круговой',
    adviceSwitch: 'Переключить',
    structureTitle: 'Как это будет выглядеть',
    structureOpen: 'Посмотреть схему целиком',
    group: 'Гр. {n}',
    advanceNote: 'закрашены — выходят дальше',
    bracket: 'Сетка на {n}',
    exitBracket: 'Не вышедшие играют свою сетку за места',
    finalGroup: 'Финал за {from}–{to}',
    everyone: 'Все со всеми',
    players: 'Игроков: {n}',
    final: 'Финал',
    tieBreakHelp:
      'Если у двух и более игроков группы одинаково очков, сначала смотрят личную встречу между ними. Когда она не решает — например, трое обыграли друг друга по кругу, — места решает это правило.',
  },
  kk: {
    startsRequired: 'Басталу күні мен уақытын көрсетіңіз',
    startsPast: 'Бұл уақыт өтіп кетті — болашақ уақытты таңдаңыз',
    regAfterStart: 'Жазылу турнир басталғаннан кешікпей жабылуы керек',
    regPast: 'Бұл уақыт өтіп кетті',
    ratingBounds: '«Кем емес» мәні «артық емес» мәнінен үлкен',
    birthBounds: '«Ерте емес» мәні «кеш емес» мәнінен кейін',
    maxParticipants: 'Кемінде 2 қатысушы',
    summary: 'Турнир құрылмады — қызылмен белгіленген өрістерді түзетіңіз: {count}',
    required: 'міндетті өріс',
    participants: 'Қанша қатысушы күтесіз',
    participantsHint:
      'Шамамен. Осы сан бойынша кездесулер есептеліп, топтар таңдалады, турнирге сақталмайды',
    adviceGroups:
      '{n} қатысушыға лайық: {sizes} адамнан {groups} топ, әрқайсысынан {advance} шығады',
    adviceApply: 'Таңдау',
    adviceApplied: 'Топтар {n} қатысушыға таңдалды',
    adviceRoundRobin:
      '{n} қатысушыға айналым — {matches} кездесу. Мұндай құрамға «Топтар және тор» ыңғайлы',
    adviceSmall: '{n} қатысушыға топтар керек емес — айналым жеткілікті',
    adviceSwitch: 'Ауыстыру',
    structureTitle: 'Қалай көрінеді',
    structureOpen: 'Сызбаны толық көру',
    group: '{n}-топ',
    advanceNote: 'боялғандары — әрі өтеді',
    bracket: '{n} адамдық тор',
    exitBracket: 'Шықпағандар орындар үшін өз торын ойнайды',
    finalGroup: '{from}–{to} орындар финалы',
    everyone: 'Әркім әркіммен',
    players: 'Ойыншылар: {n}',
    final: 'Финал',
    tieBreakHelp:
      'Топта екі не одан да көп ойыншының ұпайы тең болса, алдымен олардың өзара кездесуі қаралады. Ол шешпесе — мысалы, үшеуі бірін-бірі айналып жеңсе, — орындарды осы ереже шешеді.',
  },
  en: {
    startsRequired: 'Set the start date and time',
    startsPast: 'This time has already passed — pick a future one',
    regAfterStart: 'Registration must close no later than the start',
    regPast: 'This time has already passed',
    ratingBounds: '“At least” is higher than “at most”',
    birthBounds: '“Not before” is later than “not after”',
    maxParticipants: 'At least 2 players',
    summary: 'Tournament not created — fix the fields marked red: {count}',
    required: 'required',
    participants: 'How many players do you expect',
    participantsHint:
      'Roughly. Used to count matches and pick groups; not saved with the tournament',
    adviceGroups: 'For {n} players: {groups} groups of {sizes}, {advance} advance from each',
    adviceApply: 'Apply',
    adviceApplied: 'Groups set for {n} players',
    adviceRoundRobin:
      'A round robin for {n} players means {matches} matches. “Groups and bracket” suits this size better',
    adviceSmall: "For {n} players groups aren't needed — a round robin is enough",
    adviceSwitch: 'Switch',
    structureTitle: 'What it will look like',
    structureOpen: 'View the full layout',
    group: 'Gr. {n}',
    advanceNote: 'filled — advance',
    bracket: 'Bracket of {n}',
    exitBracket: "Those who don't advance play their own bracket for places",
    finalGroup: 'Final for {from}–{to}',
    everyone: 'Everyone plays everyone',
    players: 'Players: {n}',
    final: 'Final',
    tieBreakHelp:
      "If two or more players in a group have equal points, their head-to-head match decides first. When it doesn't — say, three players beat each other in a circle — this rule decides the places.",
  },
  zh: {
    startsRequired: '请填写开始日期和时间',
    startsPast: '该时间已过，请选择将来的时间',
    regAfterStart: '报名截止不能晚于比赛开始',
    regPast: '该时间已过',
    ratingBounds: '“不低于”大于“不高于”',
    birthBounds: '“不早于”晚于“不晚于”',
    maxParticipants: '至少 2 名选手',
    summary: '比赛未创建——请修正标红的字段：{count}',
    required: '必填',
    participants: '预计参赛人数',
    participantsHint: '大概即可。用于计算场次和分组，不会保存到比赛中',
    adviceGroups: '{n} 名选手建议：{groups} 个组，每组 {sizes} 人，每组出线 {advance} 人',
    adviceApply: '套用',
    adviceApplied: '已按 {n} 名选手分组',
    adviceRoundRobin: '{n} 名选手打单循环共 {matches} 场。这种规模更适合「小组赛+淘汰赛」',
    adviceSmall: '{n} 名选手无需分组——单循环即可',
    adviceSwitch: '切换',
    structureTitle: '赛制预览',
    structureOpen: '查看完整赛制',
    group: '第 {n} 组',
    advanceNote: '实心——出线',
    bracket: '{n} 人对阵表',
    exitBracket: '未出线者另打对阵表争夺名次',
    finalGroup: '第 {from}–{to} 名决赛组',
    everyone: '人人相互对战',
    players: '选手：{n}',
    final: '决赛',
    tieBreakHelp:
      '小组中两名及以上选手积分相同时，先看他们之间的胜负关系。若仍无法区分（例如三人循环相克），则按此规则决定名次。',
  },
  ja: {
    startsRequired: '開始日時を入力してください',
    startsPast: 'この時刻はすでに過ぎています。未来の時刻を選んでください',
    regAfterStart: '受付は大会開始までに締め切る必要があります',
    regPast: 'この時刻はすでに過ぎています',
    ratingBounds: '「以上」が「以下」より大きくなっています',
    birthBounds: '「以降」が「以前」より後になっています',
    maxParticipants: '2人以上',
    summary: '大会は作成されていません。赤い項目を修正してください：{count}',
    required: '必須',
    participants: '予想参加人数',
    participantsHint:
      'おおよそで構いません。試合数の計算とグループ分けに使い、大会には保存されません',
    adviceGroups: '{n}人なら：{sizes}人ずつ{groups}グループ、各グループ上位{advance}人が勝ち上がり',
    adviceApply: '適用',
    adviceApplied: '{n}人向けにグループを設定しました',
    adviceRoundRobin:
      '{n}人の総当たりは{matches}試合です。この人数なら「予選リーグとトーナメント」が向いています',
    adviceSmall: '{n}人ならグループは不要です。総当たりで十分です',
    adviceSwitch: '切り替える',
    structureTitle: '大会の形',
    structureOpen: '全体を見る',
    group: 'G{n}',
    advanceNote: '塗りつぶし＝勝ち上がり',
    bracket: '{n}人のトーナメント',
    exitBracket: '敗退者は順位決定トーナメントを行います',
    finalGroup: '{from}〜{to}位決定リーグ',
    everyone: '全員総当たり',
    players: '選手：{n}',
    final: '決勝',
    tieBreakHelp:
      'グループ内で2人以上が同点の場合、まず当事者同士の対戦結果を見ます。それでも決まらない場合（3人が互いに勝ち合ったなど）は、このルールで順位を決めます。',
  },
  ko: {
    startsRequired: '시작 날짜와 시간을 입력하세요',
    startsPast: '이미 지난 시간이에요 — 앞으로의 시간을 고르세요',
    regAfterStart: '신청 마감은 대회 시작보다 늦을 수 없어요',
    regPast: '이미 지난 시간이에요',
    ratingBounds: '‘이상’ 값이 ‘이하’ 값보다 커요',
    birthBounds: '‘이후’ 값이 ‘이전’ 값보다 늦어요',
    maxParticipants: '최소 2명',
    summary: '대회가 만들어지지 않았어요 — 빨간색 항목을 고치세요: {count}',
    required: '필수',
    participants: '예상 참가 인원',
    participantsHint: '대략이면 돼요. 경기 수 계산과 조 편성에 쓰이고 대회에는 저장되지 않아요',
    adviceGroups: '{n}명이면: {sizes}명씩 {groups}개 조, 조마다 {advance}명 진출',
    adviceApply: '적용',
    adviceApplied: '{n}명에 맞게 조를 정했어요',
    adviceRoundRobin:
      '{n}명 리그전은 {matches}경기예요. 이 인원에는 「조별 리그 후 토너먼트」가 더 알맞아요',
    adviceSmall: '{n}명이면 조가 필요 없어요 — 리그전으로 충분해요',
    adviceSwitch: '바꾸기',
    structureTitle: '대회 모습',
    structureOpen: '전체 구조 보기',
    group: '{n}조',
    advanceNote: '채워진 칸 — 진출',
    bracket: '{n}명 대진표',
    exitBracket: '탈락자는 순위 결정 대진표를 따로 해요',
    finalGroup: '{from}–{to}위 결선 리그',
    everyone: '모두와 한 번씩',
    players: '선수: {n}',
    final: '결승',
    tieBreakHelp:
      '조에서 두 명 이상이 동점이면 먼저 그들 사이의 맞대결을 봐요. 그래도 안 갈리면(예: 세 명이 서로 물고 물리면) 이 규칙으로 순위를 정해요.',
  },
};
