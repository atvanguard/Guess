import * as wordActions from '../actions/word-actions';
import * as gameActions from '../actions/game-actions';
import { LOAD } from 'redux-storage';
import {getHintLetter, fireImageFetchRequest} from '../utils/wordUtils';

const initialState={
  wordsLoaded: false,
  words:[],
  lastWord: null,
};

const emptyGuessedLetter = {
  letter: null,
  index: -1,
};

function removeWrongGuesses(guessedLetters, word) {
  return guessedLetters.map((data, index)=>{
    if(data.letter && data.letter.toLowerCase() === word.charAt(index).toLowerCase()){
      return data;
    } else {
      return Object.assign({}, emptyGuessedLetter);
    }
  });
}

export default function wordReducer(state = initialState, action) {
  const newState = Object.assign({}, state, {words: [...state.words]});
  switch (action.type) {
    case LOAD:
      if (action.payload && action.payload.wordReducer
        && action.payload.wordReducer.words) {
          const words = action.payload.wordReducer.words;
          let newImages = [];
          words.forEach(word => {
              newImages = newImages.concat(word.images);
          });
          fireImageFetchRequest(newImages);
      }
      return Object.assign({}, state, {wordsLoaded: true});
    break;
    case wordActions.FETCH_WORDS_SUCCESS:
      newState.words = newState.words.concat(action.data.words);
      newState.lastWord = newState.words[newState.words.length - 1]._id;
      return newState;
    break;
    case wordActions.SET_SCRABBLED_LETTERS:
      const wordForScrabbledLetters = Object.assign({},state.words[0]);
      wordForScrabbledLetters.scrabbledLetters = action.data;
      wordForScrabbledLetters.guessedLetters = wordForScrabbledLetters.word.split('').map(e=>{
        return Object.assign({}, emptyGuessedLetter);
      });
      wordForScrabbledLetters.timeLapsed = 0;
      return Object.assign({}, state, {words: [wordForScrabbledLetters, ...state.words.slice(1)]});
    break;
    case wordActions.ADD_LETTER_TO_GUESSED_WORD:
      let letterAdded = false;
      const newWord = Object.assign({}, state.words[0], {guessedLetters: Object.assign([],state.words[0].guessedLetters)});
      newWord.guessedLetters.forEach((data,index)=>{
        if (!data.letter && !letterAdded) {
          newWord.guessedLetters[index] = {
            letter : action.data.letter,
            index : action.data.index,
          };
          letterAdded = true;
        }
      });
      return Object.assign({}, state, {words : [newWord, ...state.words.slice(1)]})
    break;
    case wordActions.REMOVE_LETTER_TO_GUESSED_WORD:
      const removalLetter = action.data;
      const removalWord = Object.assign({}, state.words[0], {guessedLetters: Object.assign([],state.words[0].guessedLetters)});
      removalWord.guessedLetters = removalWord.guessedLetters.map((data,index)=>{
        if (data.letter === removalLetter.letter && data.index === removalLetter.index) {
          return Object.assign({}, emptyGuessedLetter);
        } else {
          return Object.assign({},state.words[0].guessedLetters[index]);
        }
      });
      return Object.assign({}, state, {words : [removalWord, ...state.words.slice(1)]})
    break;
    case gameActions.WORD_GUESSED:
      return Object.assign({}, state, {
        words: [...state.words.slice(1)],
      })
    break;
    case wordActions.NOTIFICATION_HINT:
    case wordActions.GIVE_HINT:
      const hintWord = Object.assign({}, state.words[0], {guessedLetters: Object.assign([],state.words[0].guessedLetters)});
      // Remove all wrong guesses
      hintWord.guessedLetters = removeWrongGuesses(hintWord.guessedLetters, state.words[0].word);
      const hint = getHintLetter(state.words[0].word, hintWord.guessedLetters, hintWord.scrabbledLetters);
      hintWord.guessedLetters[hint.inWordPosition] = hint;
      if (action.type === wordActions.GIVE_HINT) {
        hintWord.minorHintGiven = true;
      }
      else if (action.type === wordActions.NOTIFICATION_HINT && state.giveNotificateionHint) {
        delete state.giveNotificateionHint;
      }
      return Object.assign({}, state, {words : [hintWord, ...state.words.slice(1)]})
    break;
    case wordActions.REMOVE_WRONG_OPTIONS:
      const wrongLetterRemovalWord = Object.assign({}, state.words[0], {guessedLetters: Object.assign([],state.words[0].guessedLetters)});
      // Remove all wrong guesses
      wrongLetterRemovalWord.guessedLetters = removeWrongGuesses(wrongLetterRemovalWord.guessedLetters, state.words[0].word);
      const wordArray = wrongLetterRemovalWord.word.toUpperCase().split('');
      let availableChoices = wrongLetterRemovalWord.scrabbledLetters.filter(letter => wordArray.indexOf(letter) === -1);
      availableChoices.forEach(letter => {
        const letterIndex = wrongLetterRemovalWord.scrabbledLetters.indexOf(letter);
        wrongLetterRemovalWord.scrabbledLetters[letterIndex] = null;
      })
      wrongLetterRemovalWord.majorHintGiven = true;
      return Object.assign({}, state, {words : [wrongLetterRemovalWord, ...state.words.slice(1)]})
    break;
    case gameActions.LOG_TIME:
      if (state.words.length < 1) {
        return state;
      }
      const timeLoggingWord = Object.assign({}, state.words[0], {guessedLetters: Object.assign([],state.words[0].guessedLetters)});
      timeLoggingWord.timeLapsed = (timeLoggingWord.timeLapsed || 0) + 1000;
      return Object.assign({}, state, {words : [timeLoggingWord, ...state.words.slice(1)]})
    break;
    default:
      return state
  }
}