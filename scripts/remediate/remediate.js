'use strict';

module.exports.remediateDate = function(pins) {
  // only works if ran in California
  pins.pins.forEach(pin => {
    pin = _formatSubmitPin(pin);
  });
  return pins;
};

function _formatSubmitPin(pin) {
  let startDateTime, endDateTime, allDay = pin.allDay;

  pin.utcStartDateTime = pin.utcStartDateTime && new Date(pin.utcStartDateTime);
  pin.utcEndDateTime = pin.utcEndDateTime && new Date(pin.utcEndDateTime);

  if (allDay) {
    if (!pin.utcEndDateTime) {
      pin.utcEndDateTime = pin.utcStartDateTime
    }
    // set time portion to midnight
    startDateTime = _getDateTimeToDayBegin(pin.utcStartDateTime);
    // set time portion to 1 tick before midnight
    endDateTime = _getDateTimeToDayEnd(pin.utcEndDateTime);
  } else {
    startDateTime = pin.utcStartDateTime;
    endDateTime = pin.utcEndDateTime;
  }

  pin.utcStartDateTime = startDateTime; // ISO 8601 with toJSON
  pin.utcEndDateTime = endDateTime;

  return pin;
}

function _getDateTimeToDayBegin(dateTime) {
  let newDateTime = new Date(dateTime.getTime());
  newDateTime.setHours(0);
  newDateTime.setMinutes(0);
  newDateTime.setSeconds(0);
  newDateTime.setMilliseconds(0);
  return newDateTime;
}

function _getDateTimeToDayEnd(dateTime) {
  let newDateTime = new Date(dateTime.getTime());
  newDateTime.setHours(23);
  newDateTime.setMinutes(59);
  newDateTime.setSeconds(59);
  newDateTime.setMilliseconds(999);
  return newDateTime;
}
