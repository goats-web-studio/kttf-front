import type { Locale } from '@/common/i18n';

import type { FormatType } from './format-draft';

/** Описание схемы: коротко на карточке, как работает и кому подходит — в окне. */
export interface FormatText {
  readonly short: string;
  readonly how: string;
  readonly fit: string;
}

/**
 * Описания схем проведения на всех языках.
 *
 * Не в общих словарях: словари ru и kk грузятся сразу, в том числе в чанки
 * консоли судьи с бюджетом 420 КБ gzip (ТС 8.1, `precache.test.ts`), а
 * абзацы о схемах нужны только форме турнира. Здесь они уходят в её чанк.
 * `Record<Locale, …>` не даёт забыть язык.
 */
export const FORMAT_TEXTS: Readonly<Record<Locale, Readonly<Record<FormatType, FormatText>>>> = {
  ru: {
    ROUND_ROBIN: {
      short: 'Каждый играет с каждым',
      how: 'Все участники встречаются друг с другом — один раз или дважды, если выбрано два круга.\n\nЗа победу дают больше очков, чем за поражение. Места решают очки, а при равенстве — правило из настройки «Равенство очков в таблице».',
      fit: 'Небольшим турнирам до 8–10 человек. Самый честный формат — каждый сыграет со всеми, — но встреч много: при 8 участниках их 28.',
    },
    KNOCKOUT: {
      short: 'Проиграл — выбыл',
      how: 'Участники расставлены по сетке по посеву: сильнейшие не встречаются до поздних кругов. Победитель встречи проходит дальше, проигравший выбывает.\n\nЕсли участников меньше, чем мест в сетке, часть сильнейших проходит первый круг без игры. По желанию разыгрывается матч за 3-е место.',
      fit: 'Большим турнирам, когда мало времени. Встреч меньше всего, но половина участников сыграет всего одну.',
    },
    GROUPS_KNOCKOUT: {
      short: 'Сначала группы, потом сетка',
      how: 'Сначала участники играют в группах каждый с каждым. Из каждой группы выходят лучшие — сколько, задаёте вы.\n\nВышедшие играют олимпийскую сетку до финала, посев в сетку — по местам в группах. Не вышедшие могут доиграть свою сетку за следующие места.',
      fit: 'Клубным турнирам на 12–32 человека — самый частый формат. Каждый сыграет минимум 2–3 встречи, а финал остаётся финалом.',
    },
    GROUPS_FINAL_GROUPS: {
      short: 'Группы, потом финальные группы за места',
      how: 'Сначала участники играют в группах каждый с каждым. Затем места разыгрываются в финальных группах: победители групп играют между собой за 1-е и следующие места, вторые места — за места после них, и так далее.\n\nФинальных групп столько, сколько выходит из каждой группы.',
      fit: 'Когда важно, чтобы каждый вышедший сыграл ещё несколько встреч и получил точное место, а не выбыл после одной.',
    },
  },
  kk: {
    ROUND_ROBIN: {
      short: 'Әркім әркіммен ойнайды',
      how: 'Барлық қатысушылар бір-бірімен кездеседі — бір рет немесе екі айналым таңдалса, екі рет.\n\nЖеңіс үшін жеңілістен көп ұпай беріледі. Орындарды ұпай шешеді, тең болса — «Кестедегі ұпай теңдігі» баптауындағы ереже.',
      fit: '8–10 адамға дейінгі шағын турнирлерге. Ең әділ формат — әркім бәрімен ойнайды, — бірақ кездесу көп: 8 қатысушыда 28.',
    },
    KNOCKOUT: {
      short: 'Жеңілді — шықты',
      how: 'Қатысушылар торға себу бойынша орналасады: мықтылар соңғы айналымдарға дейін кездеспейді. Кездесу жеңімпазы әрі өтеді, жеңілген шығады.\n\nҚатысушы тордағы орыннан аз болса, мықтылардың бір бөлігі бірінші айналымнан ойынсыз өтеді. Қаласаңыз, 3-орын үшін матч ойналады.',
      fit: 'Уақыт аз кездегі үлкен турнирлерге. Кездесу ең аз, бірақ қатысушылардың жартысы бір ғана кездесу ойнайды.',
    },
    GROUPS_KNOCKOUT: {
      short: 'Алдымен топтар, сосын тор',
      how: 'Алдымен қатысушылар топта әркім әркіммен ойнайды. Әр топтан ең үздіктері шығады — қаншасы, сіз белгілейсіз.\n\nШыққандар финалға дейін олимпиялық торда ойнайды, торға себу — топтағы орын бойынша. Шықпағандар келесі орындар үшін өз торын ойнай алады.',
      fit: '12–32 адамдық клуб турнирлеріне — ең жиі формат. Әркім кемінде 2–3 кездесу ойнайды, ал финал финал болып қалады.',
    },
    GROUPS_FINAL_GROUPS: {
      short: 'Топтар, сосын орындар үшін финалдық топтар',
      how: 'Алдымен қатысушылар топта әркім әркіммен ойнайды. Содан кейін орындар финалдық топтарда ойналады: топ жеңімпаздары 1-орын мен келесі орындар үшін, екінші орындар — олардан кейінгі орындар үшін ойнайды, т.с.с.\n\nФиналдық топ саны әр топтан шығатын қатысушы санына тең.',
      fit: 'Шыққан әр қатысушы тағы бірнеше кездесу ойнап, бір кездесуден кейін шығып қалмай, нақты орын алуы маңызды болғанда.',
    },
  },
  en: {
    ROUND_ROBIN: {
      short: 'Everyone plays everyone',
      how: 'All players meet each other — once, or twice if two rounds are selected.\n\nA win scores more points than a loss. Places are decided by points, and ties by the rule set in “Ties in the table”.',
      fit: 'Small tournaments of up to 8–10 players. The fairest format — everyone plays everyone — but there are many matches: 28 for 8 players.',
    },
    KNOCKOUT: {
      short: "Lose and you're out",
      how: "Players are placed in the bracket by seeding, so the strongest don't meet until the late rounds. The winner of a match goes through, the loser is out.\n\nIf there are fewer players than bracket slots, some top seeds get a bye in the first round. A third-place match is optional.",
      fit: 'Large tournaments with little time. The fewest matches, but half of the players play only one.',
    },
    GROUPS_KNOCKOUT: {
      short: 'Groups first, then a bracket',
      how: "Players first play round-robin groups. The best of each group advance — you choose how many.\n\nThose who advance play a knockout bracket to the final, seeded by group places. Those who don't can play their own bracket for the lower places.",
      fit: 'Club tournaments of 12–32 players — the most common format. Everyone plays at least 2–3 matches, and the final is still a final.',
    },
    GROUPS_FINAL_GROUPS: {
      short: 'Groups, then final groups for places',
      how: 'Players first play round-robin groups. Then places are played out in final groups: group winners play each other for 1st place and below, runners-up for the places after them, and so on.\n\nThere are as many final groups as players advancing from each group.',
      fit: 'When every player who advances should play several more matches and get an exact place instead of going out after one.',
    },
  },
  zh: {
    ROUND_ROBIN: {
      short: '人人相互对战',
      how: '所有选手彼此对战一次；如选择双循环则对战两次。\n\n胜场积分高于负场。名次按积分决定，积分相同时按「积分相同」设置中的规则决定。',
      fit: '8–10 人以内的小型比赛。最公平的赛制——每人都与所有人交手——但场次多：8 人共 28 场。',
    },
    KNOCKOUT: {
      short: '输一场即淘汰',
      how: '选手按种子排入对阵表，强手要到后几轮才相遇。胜者晋级，负者淘汰。\n\n若人数少于对阵表位置，部分种子选手首轮轮空。可选加赛第三名决赛。',
      fit: '时间紧张的大型比赛。场次最少，但一半选手只打一场。',
    },
    GROUPS_KNOCKOUT: {
      short: '先小组赛，再淘汰赛',
      how: '选手先进行小组单循环。每组前几名出线——出线人数由您设定。\n\n出线者进入淘汰赛直至决赛，按小组名次排种子。未出线者可另打一张对阵表争夺后续名次。',
      fit: '12–32 人的俱乐部比赛——最常用的赛制。每人至少打 2–3 场，决赛依然是决赛。',
    },
    GROUPS_FINAL_GROUPS: {
      short: '先小组赛，再按名次分决赛组',
      how: '选手先进行小组单循环。然后在决赛组中决出名次：各组第一争夺第 1 名及以下名次，各组第二争夺其后的名次，依此类推。\n\n决赛组数量等于每组出线人数。',
      fit: '希望每位出线选手再打几场并获得确切名次，而不是输一场就出局时。',
    },
  },
  ja: {
    ROUND_ROBIN: {
      short: '全員と対戦',
      how: '全選手が互いに一度ずつ対戦します（2回戦総当たりなら二度）。\n\n勝ちは負けより多くのポイントになります。順位はポイントで決まり、同点の場合は「表の同点」設定のルールで決まります。',
      fit: '8〜10人までの小さな大会。全員と対戦する最も公平な方式ですが、試合数が多く、8人で28試合になります。',
    },
    KNOCKOUT: {
      short: '負けたら敗退',
      how: '選手はシード順にトーナメント表へ配置され、強い選手同士は終盤まで当たりません。勝者が勝ち上がり、敗者は敗退します。\n\n人数が枠より少ない場合、上位シードの一部は1回戦がシードになります。3位決定戦は任意です。',
      fit: '時間の限られた大きな大会。試合数は最少ですが、半数の選手は1試合だけになります。',
    },
    GROUPS_KNOCKOUT: {
      short: '予選リーグ、次にトーナメント',
      how: 'まずグループ内で総当たりを行います。各グループの上位が勝ち上がります（人数は設定可能）。\n\n勝ち上がった選手は決勝までトーナメントを戦い、シードはグループ順位で決まります。敗退した選手は下位順位のトーナメントを行えます。',
      fit: '12〜32人のクラブ大会で最も一般的な方式。全員が最低2〜3試合でき、決勝はしっかり決勝になります。',
    },
    GROUPS_FINAL_GROUPS: {
      short: '予選リーグ、次に順位別の決勝リーグ',
      how: 'まずグループ内で総当たりを行います。次に決勝リーグで順位を決めます。各グループ1位同士が1位以下を、2位同士がその次の順位を争う、という形です。\n\n決勝リーグの数は各グループからの勝ち上がり人数と同じです。',
      fit: '勝ち上がった全員にさらに数試合を戦わせ、1試合で敗退させずに正確な順位を付けたいとき。',
    },
  },
  ko: {
    ROUND_ROBIN: {
      short: '모두와 한 번씩',
      how: '모든 선수가 서로 한 번씩 경기합니다(2회 리그를 선택하면 두 번).\n\n승리가 패배보다 많은 점수를 받습니다. 순위는 점수로 정하고, 동점이면 「표의 동점」 설정 규칙을 따릅니다.',
      fit: '8–10명 이하의 작은 대회. 모두와 경기하는 가장 공정한 방식이지만 경기가 많습니다: 8명이면 28경기.',
    },
    KNOCKOUT: {
      short: '지면 탈락',
      how: '시드에 따라 대진표에 배치되어 강자끼리는 후반 라운드까지 만나지 않습니다. 이긴 선수는 올라가고 진 선수는 탈락합니다.\n\n인원이 대진표 자리보다 적으면 일부 상위 시드는 1라운드를 부전승으로 통과합니다. 3위 결정전은 선택입니다.',
      fit: '시간이 부족한 큰 대회. 경기 수가 가장 적지만 절반은 한 경기만 합니다.',
    },
    GROUPS_KNOCKOUT: {
      short: '조별 리그 후 토너먼트',
      how: '먼저 조 안에서 리그전을 합니다. 각 조 상위 선수가 진출하며, 인원은 직접 정합니다.\n\n진출자는 결승까지 토너먼트를 치르고, 시드는 조 순위로 정해집니다. 탈락자는 하위 순위 토너먼트를 따로 할 수 있습니다.',
      fit: '12–32명 클럽 대회에서 가장 흔한 방식. 모두 최소 2–3경기를 하고 결승은 그대로 결승입니다.',
    },
    GROUPS_FINAL_GROUPS: {
      short: '조별 리그 후 순위별 결선 리그',
      how: '먼저 조 안에서 리그전을 합니다. 그다음 결선 리그에서 순위를 가립니다. 각 조 1위끼리 1위 이하를, 2위끼리 그다음 순위를 다투는 식입니다.\n\n결선 리그 수는 각 조 진출 인원과 같습니다.',
      fit: '진출한 모든 선수가 몇 경기 더 치르고, 한 경기로 탈락하지 않고 정확한 순위를 얻어야 할 때.',
    },
  },
};

/** Подписи формы турнира, которых нет больше нигде: шаги, кнопки выбора схемы. */
export interface FormUiText {
  readonly basics: string;
  readonly basicsText: string;
  readonly terms: string;
  readonly termsText: string;
  readonly formatText: string;
  readonly seedingText: string;
  readonly limitsText: string;
  readonly how: string;
  readonly fit: string;
  readonly close: string;
  readonly choose: string;
  readonly matchesAt: string;
}

/** Там же и по той же причине, что `FORMAT_TEXTS`: только форме турнира. */
export const FORM_UI_TEXTS: Readonly<Record<Locale, FormUiText>> = {
  ru: {
    basics: 'Основное',
    basicsText: 'Как турнир называется, чей он и когда начинается',
    terms: 'Условия',
    termsText: 'Взнос, уровень турнира и сколько столов в зале',
    formatText:
      'Как играют. От схемы зависит, сколько встреч сыграет каждый и сколько продлится турнир',
    seedingText: 'Как участники расходятся по группам и сетке',
    limitsText: 'Необязательно: число мест, допуск по полу, возрасту и рейтингу, описание',
    how: 'Как это работает',
    fit: 'Кому подходит',
    close: 'Понятно',
    choose: 'Выбрать эту схему',
    matchesAt: 'Встреч: {matches} на {participants} участников',
  },
  kk: {
    basics: 'Негізгі',
    basicsText: 'Турнирдің аты, кімдікі және қашан басталады',
    terms: 'Шарттар',
    termsText: 'Жарна, турнир деңгейі және залда қанша үстел',
    formatText:
      'Қалай ойнайды. Әр қатысушы қанша кездесу ойнайтыны және турнир қанша созылатыны сызбаға байланысты',
    seedingText: 'Қатысушылар топтар мен торға қалай бөлінеді',
    limitsText: 'Міндетті емес: орын саны, жынысы, жасы мен рейтингі бойынша рұқсат, сипаттама',
    how: 'Бұл қалай жұмыс істейді',
    fit: 'Кімге лайық',
    close: 'Түсінікті',
    choose: 'Осы сызбаны таңдау',
    matchesAt: 'Кездесулер: {participants} қатысушыға {matches}',
  },
  en: {
    basics: 'Basics',
    basicsText: "The tournament's name, host club and start time",
    terms: 'Terms',
    termsText: 'Entry fee, tournament level and how many tables the hall has',
    formatText:
      'How it is played. The format decides how many matches each player gets and how long the tournament takes',
    seedingText: 'How players are placed into groups and the bracket',
    limitsText: 'Optional: number of places, gender, age and rating limits, description',
    how: 'How it works',
    fit: 'Best for',
    close: 'Got it',
    choose: 'Use this format',
    matchesAt: 'Matches: {matches} for {participants} players',
  },
  zh: {
    basics: '基本信息',
    basicsText: '比赛名称、主办俱乐部和开始时间',
    terms: '条件',
    termsText: '报名费、比赛级别和场馆球台数量',
    formatText: '比赛方式。赛制决定每人打几场、比赛持续多久',
    seedingText: '选手如何分入小组和对阵表',
    limitsText: '可选：名额、性别、年龄和积分限制、说明',
    how: '如何进行',
    fit: '适合',
    close: '明白了',
    choose: '选择此赛制',
    matchesAt: '{participants} 名选手共 {matches} 场',
  },
  ja: {
    basics: '基本',
    basicsText: '大会名、主催クラブ、開始日時',
    terms: '条件',
    termsText: '参加費、大会レベル、会場の卓数',
    formatText: '試合方式。方式によって一人あたりの試合数と大会の所要時間が決まります',
    seedingText: '選手をグループとトーナメント表にどう振り分けるか',
    limitsText: '任意：定員、性別・年齢・レーティングの制限、説明',
    how: 'しくみ',
    fit: '向いている大会',
    close: 'わかりました',
    choose: 'この方式にする',
    matchesAt: '{participants} 人で {matches} 試合',
  },
  ko: {
    basics: '기본 정보',
    basicsText: '대회 이름, 주최 클럽, 시작 시간',
    terms: '조건',
    termsText: '참가비, 대회 등급, 경기장의 탁구대 수',
    formatText: '경기 방식. 방식에 따라 선수당 경기 수와 대회 소요 시간이 정해집니다',
    seedingText: '선수를 조와 대진표에 배정하는 방법',
    limitsText: '선택: 정원, 성별·나이·레이팅 제한, 설명',
    how: '진행 방식',
    fit: '이런 대회에 적합',
    close: '확인',
    choose: '이 방식 선택',
    matchesAt: '{participants}명 기준 {matches}경기',
  },
};
