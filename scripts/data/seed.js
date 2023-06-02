/**
 * Populate DB with sample data
 */

'use strict';

import {
  MediumType,
  User,
  FullPins,
  DateTime,
  DateTimes
} from '../../server/model';

import fs from 'fs';
const rp = require('request-promise');
import _ from 'lodash';

import * as log from '../../server/util/log';

// const Model = require('../../server/model');
// const User = Model.User;
// const Users = Model.Users;
// const Pin = Model.Pin;
// const Pins = Model.Pins;
// const Medium = Model.Medium;
// const DateTimes = Model.DateTimes;


let cp,
  Request,
  userFilePath,
  pinFilePath,
  aphelionFilePath,
  solsticeFilePath,
  equinoxFilePath,
  perihelionFilePath;


// Setup
module.exports.setup = function (seedOpt) {
  cp = seedOpt.cp;
  Request = cp.Request;
  userFilePath = seedOpt.userfile;
  pinFilePath = seedOpt.pinfile;
  aphelionFilePath = seedOpt.aphelionfile;
  solsticeFilePath = seedOpt.solsticefile;
  equinoxFilePath = seedOpt.equinoxfile;
  perihelionFilePath = seedOpt.perihelionfile;

  return this;
}

module.exports.seedDB = function () {
  let mainUser,
    defaultMediumTypes = [
      {
        //id: 1,
        type: 'image'
      }, {
        //id: 2,
        type: 'twitter'
      }, {
        //id: 3,
        type: 'youtube'
      }
    ];


  const baseUrl = "http://kayaposoft.com/enrico/json/v1.0/";

  return Promise.resolve('Keep Thumb Container') //azureBlob.deleteThumbContainer().catch((e) => console.log) //incase if container never existed an erro will be thrown
    // .then(() => {
    //   return azureBlob.createThumbContainer()
    // })
    .then(() => {
      // Create Holiday Dates
      // API limitation year: 2011 to 2025 (no upper bound that is known)
      // http://kayaposoft.com/enrico/json/v1.0/?action=getPublicHolidaysForYear&year=2017&country=usa

      let holidayPerYearPromise = _.range(2011, 2026)
        .map(year => {
          let options = {
            uri: baseUrl,
            qs: {
              action: "getPublicHolidaysForYear",
              year: year,
              country: "usa"
            },
            json: true
          };
          return rp(options)
            .then(holidays => {

              let savingHoliday = holidays
                .map(holiday => {
                  //debugger;
                  let utcStartDateTime = new Date(
                    Date.UTC(
                      holiday.date.year,
                      holiday.date.month - 1,
                      holiday.date.day
                    )
                  );

                  let dateTime = new DateTime({
                    title: holiday.englishName,
                    description: holiday.note,
                    utcStartDateTime: utcStartDateTime,
                    alwaysShow: true
                  });

                  return dateTime.save();

                });
              return savingHoliday;

            });
        });

      return Promise.all(holidayPerYearPromise);
    })
    .then(() => {
      // Create Aphelion Dates
      //debugger;
      let dateJSON = JSON.parse(fs.readFileSync(aphelionFilePath, 'utf8'));
      _alwaysShow(dateJSON, true);
      let dateTimes = new DateTimes(dateJSON);

      return dateTimes.save();
    })
    .then(() => {
      // Create Solstice Dates
      let dateJSON = JSON.parse(fs.readFileSync(solsticeFilePath, 'utf8'));
      _alwaysShow(dateJSON, true);
      let dateTimes = new DateTimes(dateJSON);
      return dateTimes.save();
    })
    .then(() => {
      // Create Equinox Dates
      let dateJSON = JSON.parse(fs.readFileSync(equinoxFilePath, 'utf8'));
      _alwaysShow(dateJSON, true);
      let dateTimes = new DateTimes(dateJSON);

      return dateTimes.save();
    })
    .then(() => {
      // Create Perihelion Dates
      let dateJSON = JSON.parse(fs.readFileSync(perihelionFilePath, 'utf8'));
      _alwaysShow(dateJSON, true);
      let dateTimes = new DateTimes(dateJSON);

      return dateTimes.save();
    })
    .then(res => {
      let userJSONObjs = JSON.parse(fs.readFileSync(userFilePath, 'utf8'));
      let userPromises = userJSONObjs.map(t => {
        let user = new User(t);
        return user.saveSeed()
          .catch(error => {
            log.error('User Save Error', JSON.stringify(error));
            throw error;
          });
      });
      return Promise.all(userPromises);
    })
    .then(res => {
      const mediumTypePromises = defaultMediumTypes.map(mt => {
        const mediumType = new MediumType(mt);
        return mediumType.save();
      });
      return Promise.all(mediumTypePromises)
        .catch(e => {
          console.log("MediumType save error");
          throw e;
        });
    })
    .then(({
      //user
    }) => {
      // Create Pins
      let pinsJSONObjs = JSON.parse(fs.readFileSync(pinFilePath, 'utf8'));
      let pins = new FullPins(pinsJSONObjs);

      return pins.save()
        .catch(error => {
          log.error('Pins Save Error', JSON.stringify(error));
        });
    })
    .then(() => {
      log.info('Data Load Complete');
    });
}

function _alwaysShow(arr, show) {
  return arr.forEach(a => {
    a.alwaysShow = show;
  });
}

function _mapHolidays(arr, show) {
  return arr.forEach(a => {
    a.alwaysShow = show;
  });
}
