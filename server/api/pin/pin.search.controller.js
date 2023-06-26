'use strict';

import * as response from '../response';
//import * as fp from 'lodash/fp';

import {
  Pins,
  SearchPins,
  SearchPin,
  Mention
} from '../../model';

// Listening to pin events

export function emit(event, pin, options) {
  switch (event) {
    // TODO: Add Faiss index
    case "search:favorite":
      //favoritePin(options.userId, pin);
      break;
    case "search:unfavorite":
      //unfavoritePin(options.userId, pin);
      break;
    case "search:like":
      //likePin(options.userId, pin);
      break;
    case "search:unlike":
      //unlikePin(options.userId, pin);
      break;
    case "search:save":
    case "search:update":
      upsertPin(pin);
      break;
    case "search:remove":
      deletePin(pin);
      break;
  }
}

function pinIntersection(arrays, compareFn = (val1, val2) => {
  return val1.id === val2.id;
}) {
  if (arrays.length < 2) return arrays[0] || [];
  const array1 = arrays[0];
  const array2 = pinIntersection(arrays.slice(1), compareFn);
  return array1.filter(val1 => array2.some(val2 => compareFn(val1, val2)));
}

export function searchPins(req, res) {
  const user = req.user,
    userId = user && +user.id || 0,
    //pinId = +req.params.id,
    searchText = req.query.q,
    hasFavorite = req.query.f && req.query.f.toLowerCase() == 'watch';

  const allTags = Mention.scrapeAllMentionQuery(searchText);
  let searchTextWithoutTags = searchText;

  allTags.forEach(tag => {
    searchTextWithoutTags = searchTextWithoutTags.replaceAll(tag, '');
  });
  searchTextWithoutTags = searchTextWithoutTags && searchTextWithoutTags.trim();

  if (allTags.length) {
    if (hasFavorite) {
      Promise.all([
        SearchPins.searchTagsFavorite(userId, allTags),
        searchTextWithoutTags ? SearchPins.searchFavorite(userId, searchTextWithoutTags) : Promise.resolve(undefined)
      ]).then(([tagPins, searchPins]) => {
        if (searchPins === undefined) {
          return tagPins;
        }
        const intersectPins = pinIntersection([searchPins.pins, tagPins.pins]);
        return new SearchPins(intersectPins);
      }).then(response.withResult(res, 200))
        .catch(response.handleError(res));
    } else {
      Promise.all([
        SearchPins.searchTags(userId, allTags),
        searchTextWithoutTags ? SearchPins.search(userId, searchTextWithoutTags) : Promise.resolve(undefined)
      ]).then(([tagPins, searchPins]) => {
        if (searchPins === undefined) {
          return tagPins;
        }
        const intersectPins = pinIntersection([searchPins.pins, tagPins.pins]);
        return new SearchPins(intersectPins);
      }).then(response.withResult(res, 200))
        .catch(response.handleError(res));
    }

  } else {
    if (hasFavorite) {
      return SearchPins.searchFavorite(userId, searchText)
        .then(response.withResult(res, 200))
        .catch(response.handleError(res));
    } else {
      return SearchPins.search(userId, searchText)
        .then(response.withResult(res, 200))
        .catch(response.handleError(res));
    }
  }

}

const customAutoComplete = true;
export function autocompletePins(req, res) {
  const user = req.user,
    userId = user && +user.id || 0,
    //pinId = +req.params.id,
    searchText = req.query.q,
    hasFavorite = req.query.f && req.query.f.toLowerCase() == 'watch';

  //console.log('searchPin:', searchText);
  if (hasFavorite) {
    return (customAutoComplete
      ? SearchPins.querySearchPin(searchText, searchText) //SearchPins.search(searchText)
      : SearchPins.autocompleteFavorite(userId, searchText))
      .then(response.withResult(res, 200))
      .catch(response.handleError(res));
  } else {
    return (customAutoComplete
      ? SearchPins.querySearchPin(searchText, searchText) //SearchPins.search(searchText)
      : SearchPins.autocomplete(userId, searchText))
      .then(response.withResult(res, 200))
      .catch(response.handleError(res));
  }
}

export function favoritePin(userId, pin) {
  return SearchPin.favoritePin(userId, new SearchPin(pin));
}

export function unfavoritePin(userId, pin) {
  return SearchPin.unfavoritePin(userId, new SearchPin(pin));
}

export function likePin(userId, pin) {
  return SearchPin.likePin(userId, new SearchPin(pin));
}

export function unlikePin(userId, pin) {
  return SearchPins.unlikePin(userId, new SearchPin(pin));
}

export function upsertPin(pin) {
  return new SearchPin(pin).save();
}

export function deletePin(pin) {
  return SearchPins.delete(pin.id);
}