// jshint esversion:6


const letters = [{
    letter: "a",
    value: 1,
    count: 6
  },
  {
    letter: "á",
    value: 1,
    count: 4
  },
  {
    letter: "b",
    value: 2,
    count: 3
  },
  {
    letter: "c",
    value: 5,
    count: 1
  },
  {
    letter: "cs",
    value: 7,
    count: 1
  },
  {
    letter: "d",
    value: 2,
    count: 3
  },
  {
    letter: "e",
    value: 1,
    count: 6
  },
  {
    letter: "é",
    value: 3,
    count: 3
  },
  {
    letter: "f",
    value: 4,
    count: 2
  },
  {
    letter: "g",
    value: 2,
    count: 3
  },
  {
    letter: "gy",
    value: 4,
    count: 2
  },
  {
    letter: "h",
    value: 3,
    count: 2
  },
  {
    letter: "i",
    value: 1,
    count: 3
  },
  {
    letter: "í",
    value: 5,
    count: 1
  },
  {
    letter: "j",
    value: 4,
    count: 2
  },
  {
    letter: "k",
    value: 1,
    count: 6
  },
  {
    letter: "l",
    value: 1,
    count: 4
  },
  {
    letter: "ly",
    value: 8,
    count: 1
  },
  {
    letter: "m",
    value: 1,
    count: 3
  },
  {
    letter: "n",
    value: 1,
    count: 4
  },
  {
    letter: "ny",
    value: 5,
    count: 1
  },
  {
    letter: "o",
    value: 1,
    count: 3
  },
  {
    letter: "ó",
    value: 2,
    count: 3
  },
  {
    letter: "ö",
    value: 4,
    count: 2
  },
  {
    letter: "ő",
    value: 7,
    count: 1
  },
  {
    letter: "p",
    value: 4,
    count: 2
  },
  {
    letter: "r",
    value: 1,
    count: 4
  },
  {
    letter: "s",
    value: 1,
    count: 3
  },
  {
    letter: "sz",
    value: 3,
    count: 2
  },
  {
    letter: "t",
    value: 1,
    count: 5
  },
  {
    letter: "ty",
    value: 10,
    count: 1
  },
  {
    letter: "u",
    value: 4,
    count: 2
  },
  {
    letter: "ú",
    value: 7,
    count: 1
  },
  {
    letter: "ü",
    value: 4,
    count: 2
  },
  {
    letter: "ű",
    value: 7,
    count: 1
  },
  {
    letter: "v",
    value: 3,
    count: 2
  },
  {
    letter: "z",
    value: 4,
    count: 2
  },
  {
    letter: "zs",
    value: 8,
    count: 1
  },
  {
    letter: "",
    value: 0,
    count: 2
  }
];

exports.shuffleAtStart = function(){
    const letterStack = [];
    let shuffledLetters = [];
    letters.forEach(function(letter) {
      console.log(letter.letter + " - " + letter.count);
      for (var i = 0; i < letter.count; i++) {
        letterStack.push({
          letter: letter.letter,
          value: letter.value
        });
      }
    });
    console.log("letterStack: " + letterStack.length);
    shuffledLetters = shuffle(letterStack);
    console.log("Shuffled letters");
    console.log(shuffledLetters);
    console.log("shuffledLetters amount: " + shuffledLetters.length);

    return shuffledLetters;

};


exports.dealAtStartForPlayer = function(shuffledLetters, letterStackPerPlayer) {
  console.log("LETTERS: values there?");
  console.log(shuffledLetters);

  const letterStackToBeDealt = [];

  for (var i = 0; i < letterStackPerPlayer; i++) {
    if (shuffledLetters.length > 0) {
      letterStackToBeDealt.push(shuffledLetters.shift());
      console.log("letterStackToBeDealt: " + letterStackToBeDealt);
    } else {
      console.log("No more letters.");
    }
  }


  return {
    letterStackToBeDealt: letterStackToBeDealt,
    shuffledLettersAfterDealing: shuffledLetters
  };

};

// https://www.w3resource.com/javascript-exercises/javascript-array-exercise-17.php
function shuffle(arra1) {
  let ctr = arra1.length;
  let temp;
  let index;
  // While there are elements in the array
  while (ctr > 0) {
    // Pick a random index
    index = Math.floor(Math.random() * ctr);
    // Decrease ctr by 1
    ctr--;
    // And swap the last element with it
    temp = arra1[ctr];
    arra1[ctr] = arra1[index];
    arra1[index] = temp;
  }
  return arra1;
}
