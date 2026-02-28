import { useTimerStore } from "@/stores/timerStore";

// Mock the DB module so timerStore doesn't try to import expo-sqlite
jest.mock("@/db/client", () => ({
  db: {},
  initDatabase: jest.fn(),
}));

describe("useTimer hook (interval logic)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    useTimerStore.setState({
      isRunning: false,
      activeEntryId: null,
      description: "",
      projectId: null,
      tagIds: [],
      elapsedSeconds: 0,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("tick increments elapsedSeconds when called repeatedly", () => {
    useTimerStore.setState({ isRunning: true, elapsedSeconds: 0 });

    // Simulate 5 ticks
    for (let i = 0; i < 5; i++) {
      useTimerStore.getState().tick();
    }

    expect(useTimerStore.getState().elapsedSeconds).toBe(5);
  });

  it("tick does not reset other state fields", () => {
    useTimerStore.setState({
      isRunning: true,
      activeEntryId: 42,
      description: "Test task",
      projectId: 7,
      tagIds: [1, 2],
      elapsedSeconds: 10,
    });

    useTimerStore.getState().tick();

    const state = useTimerStore.getState();
    expect(state.elapsedSeconds).toBe(11);
    expect(state.isRunning).toBe(true);
    expect(state.activeEntryId).toBe(42);
    expect(state.description).toBe("Test task");
    expect(state.projectId).toBe(7);
    expect(state.tagIds).toEqual([1, 2]);
  });

  it("setInterval can drive tick at 1-second intervals", () => {
    useTimerStore.setState({ isRunning: true, elapsedSeconds: 0 });

    const interval = setInterval(() => {
      useTimerStore.getState().tick();
    }, 1000);

    // Advance 3 seconds
    jest.advanceTimersByTime(3000);
    expect(useTimerStore.getState().elapsedSeconds).toBe(3);

    // Advance 2 more seconds
    jest.advanceTimersByTime(2000);
    expect(useTimerStore.getState().elapsedSeconds).toBe(5);

    clearInterval(interval);
  });

  it("clearing interval stops the tick", () => {
    useTimerStore.setState({ isRunning: true, elapsedSeconds: 0 });

    const interval = setInterval(() => {
      useTimerStore.getState().tick();
    }, 1000);

    jest.advanceTimersByTime(3000);
    expect(useTimerStore.getState().elapsedSeconds).toBe(3);

    clearInterval(interval);

    // Should not increment after clearing
    jest.advanceTimersByTime(3000);
    expect(useTimerStore.getState().elapsedSeconds).toBe(3);
  });

  it("reset stops counting and resets to zero", () => {
    useTimerStore.setState({
      isRunning: true,
      elapsedSeconds: 100,
      activeEntryId: 5,
      description: "Something",
    });

    useTimerStore.getState().reset();

    const state = useTimerStore.getState();
    expect(state.isRunning).toBe(false);
    expect(state.elapsedSeconds).toBe(0);
    expect(state.activeEntryId).toBeNull();
    expect(state.description).toBe("");
  });
});
