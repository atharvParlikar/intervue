# Much Needed features

## Important
- [ ] Password protect meetings
- [ ] Notification to accept or decline a user into a meeting
- [ ] A shared chat
- [ ] Invite users

## Easy
- [ ] Switch between your video and other users video
- [ ] Fluid windows (Editor/Output/WebRTCVideo)
- [ ] Change room uuid a little shorter

## Vague or Unclear
- [ ] Cursor User Identity (doing)
- [ ] Show error on the Output console
- [ ] Better UI/UX
- [ ] Better user management


## Solution in progress

- Find a way to verify jwt tokens (clerk session tokens)
  - Error: token-invalid-signature
  - Research about: complete JWT workflow
  - Reguarding: issue #4

## Question to ask

- do we need database for storing room related info?

## Connection Algorithm

### Host
Home(createRoom, server) => Index(createSuccessful, Client)

### Participant
Home(joinRoom, server)
=> Index(notify, hostClient)
=> Home(acceptJoin, server)
=> Index(joinSuccess, participantClient)
