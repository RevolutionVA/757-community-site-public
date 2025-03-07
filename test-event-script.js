const fs = require('fs');
const path = require('path');

// Sample event data
const issueData = {
  event: {
    title: "Code and Coffee",
    link: "https://757tech.org/",
    date: "2025-04-01T08:00:00.000Z",
    description: "We're going to have coffee and talk code.",
    source: "community-submission",
    venue: "Starbucks",
    address: "1000 Independence Blvd, Virginia Beach, VA 23456",
    type: "meetup",
    endDate: "2025-04-01T10:00:00.000Z"
  },
  issueTitle: "[Event]: Code and Coffee"
};

const event = issueData.event;

// Log the event to verify it's correct
console.log("Event data:", event);

// This is a simulation - in the actual workflow, we would read and write to the calendar file
console.log("Event would be added to calendar and sorted by date");

// The script works if we reach this point
console.log("Script executed successfully"); 