# PokeLearn QA Testing

## Purpose

This document records quality assurance testing performed on PokeLearn. Testing covers core functionality, voice interaction, AI responses, quizzes, progress tracking, accessibility, edge cases, and child-safety considerations.


---

## 1. Pokémon Selection

| Test Case                              | Expected Result                                        | Status |
| -------------------------------------- | ------------------------------------------------------ | ------ |
| Select the default Pokémon             | Default Pokémon is displayed correctly                 | ⬜      |
| Search for a Pokémon by name           | Matching Pokémon can be found                          | ⬜      |
| Select a different Pokémon             | Selected Pokémon becomes the active teacher            | ⬜      |
| Switch between Pokémon                 | Teacher changes correctly without breaking the session | ⬜      |
| Toggle Shiny Pokémon                   | Shiny version is displayed when available              | ⬜      |
| Select different Pokémon personalities | Responses reflect the selected Pokémon's personality   | ⬜      |

### Observations

Record actual results, unexpected behaviour, or usability issues here.

---

## 2. Voice Interaction

| Test Case                        | Expected Result                                          | Status |
| -------------------------------- | -------------------------------------------------------- | ------ |
| Start voice input                | Microphone interaction starts correctly                  | ⬜      |
| Ask a clear question             | Speech is transcribed accurately                         | ⬜      |
| Use South Asian-accented English | Speech remains understandable and accurately transcribed | ⬜      |
| Ask a short question             | Short speech is processed correctly                      | ⬜      |
| Ask a longer question            | Longer speech is processed correctly                     | ⬜      |
| Speak with background noise      | System handles reduced audio clarity appropriately       | ⬜      |
| Deny microphone permission       | User receives appropriate feedback/fallback              | ⬜      |
| Voice service unavailable        | Appropriate error handling is displayed                  | ⬜      |

### Observations

Record transcription accuracy, errors, delays, and other findings.

---

## 3. Text Chat

| Test Case                           | Expected Result                                                               | Status |
| ----------------------------------- | ----------------------------------------------------------------------------- | ------ |
| Enter a normal educational question | Appropriate response is generated                                             | ⬜      |
| Submit a short question             | Question is processed correctly                                               | ⬜      |
| Submit a longer question            | Question is processed correctly                                               | ⬜      |
| Submit an empty question            | User is prevented from sending invalid input or receives appropriate feedback | ⬜      |
| Submit multiple questions           | Conversation continues correctly                                              | ⬜      |
| Use slang or informal wording       | Input is handled appropriately                                                | ⬜      |

### Observations

Record response quality, errors, delays, or unexpected behaviour.

---

## 4. Subject & Learning Experience

| Test Case                          | Expected Result                            | Status |
| ---------------------------------- | ------------------------------------------ | ------ |
| Ask a Science-related question     | Question is handled as a Science topic     | ⬜      |
| Ask a Mathematics-related question | Question is handled as a Mathematics topic | ⬜      |
| Ask an English-related question    | Question is handled as an English topic    | ⬜      |
| Ask a Geography-related question   | Question is handled as a Geography topic   | ⬜      |
| Ask an off-topic question          | System handles it appropriately            | ⬜      |
| Change topics during a session     | Learning experience continues correctly    | ⬜      |

### Observations

Record subject detection behaviour and any incorrect classifications.

---

## 5. AI Responses & Pokémon Personality

| Test Case                                    | Expected Result                                                             | Status |
| -------------------------------------------- | --------------------------------------------------------------------------- | ------ |
| Ask a factual educational question           | Response is relevant and educational                                        | ⬜      |
| Ask the same question with different Pokémon | Response reflects the selected Pokémon's personality                        | ⬜      |
| Ask a question while expressing confusion    | Response appropriately addresses the learner's confusion                    | ⬜      |
| Ask a question while expressing frustration  | Response uses an appropriate supportive tone                                | ⬜      |
| Ask an unclear question                      | System responds appropriately rather than inventing unnecessary information | ⬜      |
| Ask a follow-up question                     | Conversation maintains appropriate context                                  | ⬜      |

### Observations

Record notable response behaviour, personality consistency, or incorrect responses.

---

## 6. Quiz System

| Test Case                    | Expected Result                              | Status |
| ---------------------------- | -------------------------------------------- | ------ |
| Reach the quiz trigger       | Quiz is generated at the appropriate point   | ⬜      |
| Quiz questions are generated | Questions relate to the learning interaction | ⬜      |
| Select an answer             | Selection is registered correctly            | ⬜      |
| Submit a correct answer      | Correct result is displayed                  | ⬜      |
| Submit an incorrect answer   | Incorrect result is handled appropriately    | ⬜      |
| Complete the quiz            | Quiz completion is recorded correctly        | ⬜      |
| Star reward is displayed     | Reward is shown correctly                    | ⬜      |

### Observations

Record quiz quality, incorrect questions, UI issues, and reward behaviour.

---

## 7. Progress Tracking

| Test Case                         | Expected Result                      | Status |
| --------------------------------- | ------------------------------------ | ------ |
| Ask a question                    | Question count updates appropriately | ⬜      |
| Earn stars                        | Star count updates correctly         | ⬜      |
| Maintain activity across sessions | Streak behaviour works as expected   | ⬜      |
| Refresh the page                  | Stored progress is retained          | ⬜      |
| Close and reopen the app          | Stored progress behaves as expected  | ⬜      |

### Observations

Record any inconsistencies in questions, stars, or streak tracking.

---

## 8. Accessibility & Fallbacks

| Test Case                                  | Expected Result                                | Status |
| ------------------------------------------ | ---------------------------------------------- | ------ |
| Use text instead of voice                  | Learning experience remains usable             | ⬜      |
| Use the app without microphone access      | Text fallback remains available                | ⬜      |
| Read interface text                        | Text is clear and readable                     | ⬜      |
| Identify main controls                     | Buttons and controls are understandable        | ⬜      |
| Use the application in a noisy environment | Text fallback provides an alternative to voice | ⬜      |

### Observations

Record accessibility issues or recommendations.

---

## 9. Edge Cases & Error Handling

| Test Case                  | Expected Result                             | Status |
| -------------------------- | ------------------------------------------- | ------ |
| Empty input                | Appropriate validation or feedback          | ⬜      |
| Very short input           | Input is handled appropriately              | ⬜      |
| Very long input            | Application handles input without breaking  | ⬜      |
| Rapid repeated submissions | Application remains stable                  | ⬜      |
| Network interruption       | Appropriate error handling is shown         | ⬜      |
| AI service unavailable     | Appropriate error message/fallback is shown | ⬜      |
| Voice service unavailable  | Appropriate error message/fallback is shown | ⬜      |
| Unexpected input           | Application remains stable                  | ⬜      |

### Observations

Record reproducible issues and steps required to reproduce them.

---

## 10. AI Safety & Child-Safety Testing

The following inputs should be tested to evaluate how the application handles potentially unsafe or inappropriate interactions:

* [ ] Normal educational questions
* [ ] Off-topic questions
* [ ] Inappropriate questions
* [ ] Requests for personal information
* [ ] Harmful questions
* [ ] Prompt-injection-style instructions
* [ ] Questions containing slang
* [ ] Questions expressing confusion
* [ ] Questions expressing frustration

### Observations

Record the actual application behaviour and any concerns identified during testing.

---

## 11. UI/UX Testing

* [ ] Pokémon selection interface is understandable
* [ ] Pokémon search is usable
* [ ] Shiny toggle is understandable
* [ ] Voice controls are clear
* [ ] Text input is easy to use
* [ ] Quiz interface is understandable
* [ ] Star/reward feedback is visible
* [ ] Progress information is understandable
* [ ] Error messages provide useful feedback
* [ ] Layout remains usable on different screen sizes

### Observations

Record usability issues and recommendations.

---

## 12. QA Findings & Recommendations

### Bugs / Issues Found

Document reproducible bugs using:

**Issue:**
**Steps to reproduce:**
**Expected behaviour:**
**Actual behaviour:**
**Severity:**

### Recommendations

Record product, UX, accessibility, or testing recommendations here.

---

## Testing Summary

| Area                          | Result       |
| ----------------------------- | ------------ |
| Pokémon Selection             | ⬜ Not Tested |
| Voice Interaction             | ⬜ Not Tested |
| Text Chat                     | ⬜ Not Tested |
| Subject & Learning Experience | ⬜ Not Tested |
| AI Responses & Personality    | ⬜ Not Tested |
| Quiz System                   | ⬜ Not Tested |
| Progress Tracking             | ⬜ Not Tested |
| Accessibility                 | ⬜ Not Tested |
| Edge Cases & Error Handling   | ⬜ Not Tested |
| AI & Child Safety             | ⬜ Not Tested |
| UI/UX                         | ⬜ Not Tested |

**Last Updated:** 2026-09-22

