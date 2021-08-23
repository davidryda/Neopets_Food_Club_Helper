export default class Countdown {
    constructor() {};
    public async CountdownAsync(secondsToWait: number): Promise<boolean> {
        for (let i = secondsToWait; i > 0; i--) {
            await new Promise(function (resolve, reject) {
                setTimeout(() => {
                    console.log(i);
                    resolve(true);
                }, 1000);
            });
        }
        return true;
    }
}

//how to use
// const NameOfFunction = () => {
//     let st = setTimeout(() => {
//         //if your task was successful, clear timeout
//         clearTimeout(st);
//         //else, run function again
//         new Countdown().CountdownAsync(10).then(() => NameOfFunction());
//     }, 0);
// };
