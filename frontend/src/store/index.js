import { createStore, combineReducers, applyMiddleware } from 'redux';
import { thunk } from 'redux-thunk';

// Reducers
const initialState = {
  scans: [],
  stats: null,
  currentScan: null,
  loading: false,
  error: null
};

// Action Types
const SET_SCANS = 'SET_SCANS';
const SET_STATS = 'SET_STATS';
const SET_CURRENT_SCAN = 'SET_CURRENT_SCAN';
const SET_LOADING = 'SET_LOADING';
const SET_ERROR = 'SET_ERROR';

// Action Types
export const SET_SCANS = 'SET_SCANS';
export const SET_STATS = 'SET_STATS';
export const SET_CURRENT_SCAN = 'SET_CURRENT_SCAN';
export const SET_LOADING = 'SET_LOADING';
export const SET_ERROR = 'SET_ERROR';

// Action Creators
export const setScans = (scans) => ({
  type: SET_SCANS,
  payload: scans
});

export const setStats = (stats) => ({
  type: SET_STATS,
  payload: stats
});

export const setCurrentScan = (scan) => ({
  type: SET_CURRENT_SCAN,
  payload: scan
});

export const setLoading = (loading) => ({
  type: SET_LOADING,
  payload: loading
});

export const setError = (error) => ({
  type: SET_ERROR,
  payload: error
});

// Reducers
const scansReducer = (state = initialState.scans, action) => {
  switch (action.type) {
    case SET_SCANS:
      return action.payload;
    default:
      return state;
  }
};

const statsReducer = (state = initialState.stats, action) => {
  switch (action.type) {
    case SET_STATS:
      return action.payload;
    default:
      return state;
  }
};

const currentScanReducer = (state = initialState.currentScan, action) => {
  switch (action.type) {
    case SET_CURRENT_SCAN:
      return action.payload;
    default:
      return state;
  }
};

const loadingReducer = (state = initialState.loading, action) => {
  switch (action.type) {
    case SET_LOADING:
      return action.payload;
    default:
      return state;
  }
};

const errorReducer = (state = initialState.error, action) => {
  switch (action.type) {
    case SET_ERROR:
      return action.payload;
    default:
      return state;
  }
};

// Combine reducers
const rootReducer = combineReducers({
  scans: scansReducer,
  stats: statsReducer,
  currentScan: currentScanReducer,
  loading: loadingReducer,
  error: errorReducer
});

// Create store
const store = createStore(rootReducer, applyMiddleware(thunk));

export default store;