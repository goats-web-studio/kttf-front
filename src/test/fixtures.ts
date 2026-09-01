import type {
  ClubView,
  PlayerView,
  ResultParticipantView,
  StageView,
  TournamentResultsView,
  TournamentView,
} from '@kttf/shared/types';

/**
 * Ответ `GET /tournaments/:id/results` для тестов публичных экранов.
 *
 * Собран так, чтобы в нём был каждый неочевидный случай контракта: место,
 * доставшееся по сетке; два разных повода для пустого места; делёжка мест;
 * равенство, которое не развёл судья; техническая победа; встреча, ждущая
 * победителя другой; участник вне зачёта; участник без начисленного рейтинга.
 */

export const PLAYER_IDS = {
  first: '00000000-0000-4000-8000-000000000101',
  second: '00000000-0000-4000-8000-000000000102',
  third: '00000000-0000-4000-8000-000000000103',
  fourth: '00000000-0000-4000-8000-000000000104',
} as const;

export const TOURNAMENT_ID = '00000000-0000-4000-8000-000000000001';
const CLUB_ID = '00000000-0000-4000-8000-000000000002';
const STAGE_ID = '00000000-0000-4000-8000-000000000003';
const GROUP_ID = '00000000-0000-4000-8000-000000000004';
const SEMIFINAL_ID = '00000000-0000-4000-8000-000000000011';
const FINAL_ID = '00000000-0000-4000-8000-000000000012';
export const PLAYING_MATCH_ID = '00000000-0000-4000-8000-000000000031';
export const QUEUED_MATCH_ID = '00000000-0000-4000-8000-000000000032';

function player(id: string, lastName: string, rating: string): PlayerView {
  return {
    id,
    userId: null,
    lastName,
    firstName: 'Асан',
    middleName: null,
    birthYear: 2000,
    gender: 'MALE',
    city: 'Алматы',
    photoUrl: null,
    clubId: CLUB_ID,
    rating,
    ratedMatches: 25,
    isProvisional: false,
    createdAt: '2026-08-01T00:00:00.000Z',
  };
}

export const PLAYERS = {
  first: player(PLAYER_IDS.first, 'Ержанов', '520.00'),
  second: player(PLAYER_IDS.second, 'Смагулов', '480.00'),
  third: player(PLAYER_IDS.third, 'Тлеубаев', '460.00'),
  fourth: player(PLAYER_IDS.fourth, 'Ахметов', '300.00'),
} as const;

export const TOURNAMENT: TournamentView = {
  id: TOURNAMENT_ID,
  clubId: CLUB_ID,
  name: 'Кубок Алматы',
  startsAt: '2026-09-05T09:00:00.000Z',
  registrationEndsAt: null,
  status: 'RATED',
  entryFee: 3000,
  maxParticipants: null,
  ratingCapMax: null,
  ratingCapMin: null,
  birthYearFrom: null,
  birthYearTo: null,
  genderLimit: null,
  level: 'CLUB',
  tableCount: 4,
  formatConfig: {
    type: 'GROUPS_KNOCKOUT',
    groupCount: 2,
    advancePerGroup: 2,
    groupSetsToWin: 3,
    koSetsToWin: 3,
    thirdPlace: false,
  },
  seedingConfig: { method: 'RATING', separateByClub: true },
  description: null,
  prizeInfo: null,
  publicToken: 'token-1',
  participantCount: 4,
  createdAt: '2026-08-20T00:00:00.000Z',
  startedAt: '2026-09-05T09:00:00.000Z',
  finishedAt: '2026-09-05T15:00:00.000Z',
  ratedAt: '2026-09-05T15:05:00.000Z',
};

const PARTICIPANTS: ResultParticipantView[] = [
  {
    player: PLAYERS.first,
    place: 1,
    reason: 'BRACKET',
    status: 'PLAYING',
    isRated: true,
    seed: 1,
  },
  {
    player: PLAYERS.second,
    place: 2,
    reason: 'BRACKET',
    status: 'PLAYING',
    isRated: true,
    seed: 2,
  },
  // Выбыл на групповом этапе: за места не играл вовсе.
  {
    player: PLAYERS.third,
    place: null,
    reason: 'GROUP_EXIT',
    status: 'PLAYING',
    isRated: true,
    seed: 3,
  },
  // Снялся и играл вне зачёта: место не определено по другой причине.
  {
    player: PLAYERS.fourth,
    place: null,
    reason: 'UNDECIDED',
    status: 'WITHDRAWN',
    isRated: false,
    seed: null,
  },
];

const STAGES: StageView[] = [
  {
    id: STAGE_ID,
    order: 1,
    type: 'GROUPS',
    name: 'Группы',
    groups: [
      {
        id: GROUP_ID,
        label: 'Группа A',
        order: 1,
        participants: [PLAYER_IDS.first, PLAYER_IDS.third],
      },
    ],
    matches: [
      {
        id: '00000000-0000-4000-8000-000000000021',
        stageId: STAGE_ID,
        groupId: GROUP_ID,
        playerAId: PLAYER_IDS.first,
        playerBId: PLAYER_IDS.third,
        sourceA: null,
        sourceB: null,
        status: 'FINISHED',
        tableNumber: 1,
        setsA: 3,
        setsB: 0,
        resultType: 'WALKOVER',
        bracketRound: 1,
        bracketSlot: 0,
        startedAt: '2026-09-05T10:00:00.000Z',
        finishedAt: '2026-09-05T10:25:00.000Z',
      },
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    order: 2,
    type: 'KNOCKOUT',
    name: 'Плей-офф',
    groups: [],
    matches: [
      {
        id: SEMIFINAL_ID,
        stageId: '00000000-0000-4000-8000-000000000005',
        groupId: null,
        playerAId: PLAYER_IDS.first,
        playerBId: PLAYER_IDS.second,
        sourceA: null,
        sourceB: null,
        status: 'FINISHED',
        tableNumber: 1,
        setsA: 3,
        setsB: 1,
        resultType: 'NORMAL',
        bracketRound: 1,
        bracketSlot: 0,
        startedAt: '2026-09-05T10:00:00.000Z',
        finishedAt: '2026-09-05T10:25:00.000Z',
      },
      // Финал ждёт победителя полуфинала: участники не определены (ADR-019).
      {
        id: FINAL_ID,
        stageId: '00000000-0000-4000-8000-000000000005',
        groupId: null,
        playerAId: null,
        playerBId: null,
        sourceA: { kind: 'WINNER', matchId: SEMIFINAL_ID },
        sourceB: null,
        status: 'PENDING',
        tableNumber: null,
        setsA: null,
        setsB: null,
        resultType: null,
        bracketRound: 2,
        bracketSlot: 0,
        startedAt: null,
        finishedAt: null,
      },
    ],
  },
];

export const RESULTS: TournamentResultsView = {
  tournament: TOURNAMENT,
  participants: PARTICIPANTS,
  shared: [{ participants: [PLAYER_IDS.third, PLAYER_IDS.fourth], places: [3, 4] }],
  unresolved: [],
  standings: {
    tournamentId: TOURNAMENT_ID,
    groups: [
      {
        stageId: STAGE_ID,
        groupId: GROUP_ID,
        label: 'Группа A',
        rows: [
          {
            participant: PLAYER_IDS.first,
            played: 1,
            wins: 1,
            losses: 0,
            points: 2,
            setsWon: 3,
            setsLost: 0,
            setDiff: 3,
            ballsWon: 33,
            ballsLost: 12,
            ballDiff: 21,
            place: 1,
          },
          // Место не определено, пока равенство не развёл судья (ADR-008).
          {
            participant: PLAYER_IDS.third,
            played: 1,
            wins: 0,
            losses: 1,
            points: 1,
            setsWon: 0,
            setsLost: 3,
            setDiff: -3,
            ballsWon: 12,
            ballsLost: 33,
            ballDiff: -21,
            place: null,
          },
        ],
        unresolved: [{ participants: [PLAYER_IDS.third, PLAYER_IDS.fourth], places: [2, 3] }],
      },
    ],
  },
  stages: STAGES,
  ratings: [
    {
      playerId: PLAYER_IDS.first,
      ratingAtStart: '500.00',
      ratingAfter: '520.00',
      totalDelta: '20.00',
      events: [
        {
          matchId: SEMIFINAL_ID,
          ratingBefore: '500.00',
          delta: '20.00',
          ratingAfter: '520.00',
        },
      ],
    },
    {
      playerId: PLAYER_IDS.second,
      ratingAtStart: '490.00',
      ratingAfter: '480.00',
      totalDelta: '-10.00',
      events: [],
    },
    // Рейтинг по турниру ещё не начислен.
    {
      playerId: PLAYER_IDS.fourth,
      ratingAtStart: null,
      ratingAfter: null,
      totalDelta: '0',
      events: [],
    },
  ],
};

export const CLUB: ClubView = {
  id: CLUB_ID,
  name: 'Клуб «Алатау»',
  shortName: null,
  city: 'Алматы',
  address: null,
  lat: null,
  lng: null,
  tableCount: 8,
  phone: null,
  whatsapp: null,
  instagram: null,
  logoUrl: null,
  description: null,
  createdAt: '2026-08-01T00:00:00.000Z',
};

/** Конверт списка: страница с одним элементом. */
export function pageOf<T>(items: readonly T[]): {
  items: readonly T[];
  total: number;
  page: number;
  limit: number;
} {
  return { items, total: items.length, page: 1, limit: 20 };
}

/**
 * Снимок идущего турнира для консоли судьи.
 *
 * Отличается от `RESULTS` тем, что турнир не закончен: одна встреча на столе,
 * одна ждёт в очереди, обе с известными участниками. Иначе проверять на
 * экране судьи нечего — очередь пуста.
 */
export const CONSOLE_STATE: TournamentResultsView = {
  ...RESULTS,
  tournament: { ...TOURNAMENT, status: 'RUNNING', tableCount: 2, ratedAt: null, finishedAt: null },
  stages: [
    {
      id: STAGE_ID,
      order: 1,
      type: 'ROUND_ROBIN',
      name: 'Круговая',
      groups: [],
      matches: [
        {
          id: PLAYING_MATCH_ID,
          stageId: STAGE_ID,
          groupId: null,
          playerAId: PLAYER_IDS.first,
          playerBId: PLAYER_IDS.second,
          sourceA: null,
          sourceB: null,
          status: 'PLAYING',
          tableNumber: 1,
          setsA: null,
          setsB: null,
          resultType: null,
          bracketRound: 1,
          bracketSlot: 0,
          startedAt: '2026-09-05T10:00:00.000Z',
          finishedAt: null,
        },
        {
          id: QUEUED_MATCH_ID,
          stageId: STAGE_ID,
          groupId: null,
          playerAId: PLAYER_IDS.third,
          playerBId: PLAYER_IDS.fourth,
          sourceA: null,
          sourceB: null,
          status: 'PENDING',
          tableNumber: null,
          setsA: null,
          setsB: null,
          resultType: null,
          bracketRound: 1,
          bracketSlot: 1,
          startedAt: null,
          finishedAt: null,
        },
      ],
    },
  ],
  standings: { tournamentId: TOURNAMENT_ID, groups: [] },
};
