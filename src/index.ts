import { SubredditResponse } from "./models/RedditModels/AllSubredditModels";
import { SubredditPostResponse } from "./models/RedditModels/AllSubredditPostModels";
import IBet from "./models/Bet";
import BetSet from "./models/BetSet";
import arenas from "./data/arenas";
import pirates from "./data/pirates";
import IArenaPosition from "./models/ArenaPosition";

export class App {
    constructor() {
        const maxBetAmount = this.FindMaxFoodClubBetAmount();
        this.SetMaxBetAmount(maxBetAmount);
        this.FetchFoodClubBetsRedditThread().then(url => {
            if (url === null) alert("No food club bets url returned from the neopets subreddit");
            this.ParseFoodClubBetsRedditThread(url).then(betSets => {
                this.WriteBetSetsToPage(betSets);
            });
        });
    }

    public FindBetForm(): HTMLElement {
        const betForms = document.getElementsByName("bet_form");
        if (betForms.length !== 1) {
            const e = `${betForms.length} elements with the name of 'bet_form' found! There sould only be one!`;
            alert(e);
            throw new Error(e);
        }
        return betForms[0];
    }

    public FindMaxFoodClubBetAmount(): number {
        const pTags = document.querySelectorAll("p");
        let htmlParagraphElement: HTMLParagraphElement = null;
        for (let i = 0; i < pTags.length; i++) {
            if (pTags[i].textContent.includes("50 + 2")) {
                htmlParagraphElement = pTags[i];
                break;
            }
        }
        if (htmlParagraphElement === null) return 0;
        const boldTags = htmlParagraphElement.querySelectorAll("b");
        let maxBetAmount: number;
        for (let i = 0; i < boldTags.length; i++) {
            const parsedTextContent = parseInt(boldTags[i].textContent);
            if (!isNaN(parsedTextContent)) {
                maxBetAmount = parsedTextContent;
            }
        }
        return maxBetAmount ?? 0;
    }

    public SetMaxBetAmount(maxBetAmount: number) {
        const betAmountElements = document.getElementsByName("bet_amount");
        if (betAmountElements.length !== 1) {
            alert("Could not find a bet amount!");
            return;
        }
        const betAmountInputElement = betAmountElements[0] as HTMLInputElement;
        betAmountInputElement.value = maxBetAmount.toString();
    }

    public WriteBetSetsToPage(betSets: BetSet[]) {
        let betForm = this.FindBetForm();

        for (let betSet of betSets) {
            let div = document.createElement("div");
            div.style.marginBottom = "10px";
            let table = document.createElement("table");
            table.style.width = "500px";
            table.style.border = "1px solid black";
            table.style.borderCollapse = "collapse";
            let thead = document.createElement("thead");
            let tbody = document.createElement("tbody");
            table.appendChild(thead);
            table.appendChild(tbody);

            let theadTr = document.createElement("tr");
            for (let i = -2; i < arenas.length; i++) {
                let th = document.createElement("th");
                th.style.border = "1px solid black";
                th.style.borderCollapse = "collapse";
                if (i === -2) th.innerHTML = "";
                else if (i === -1) th.innerHTML = "#";
                else th.innerHTML = arenas[i].ShortName;
                theadTr.appendChild(th);
            }
            thead.appendChild(theadTr);

            for (let row of betSet.Rows) {
                const bets = row.Bets;
                let tr = document.createElement("tr");
                for (let i = -2; i < bets.length; i++) {
                    let td = document.createElement("td");
                    td.style.border = "1px solid black";
                    td.style.borderCollapse = "collapse";
                    if (i === -2) {
                        let radio = document.createElement("input");
                        radio.type = "radio";
                        radio.onclick = () => this.FillOutBets(bets);
                        td.appendChild(radio);
                    } 
                    else if (i === -1) {
                        td.innerHTML = row.BetNumber.toString();
                    }
                    else {
                        const arena = arenas[i];
                        const matchedArena = bets.find(b => b.Arena.Id === arena.Id);
                        if (matchedArena === undefined) {
                            throw new Error("Could not find a matching arena, something went wrong!");
                        }
                        const pirate = matchedArena.Pirate;
                        td.innerHTML = pirate?.ShortName ?? "";
                    }
                    tr.appendChild(td);
                }
                tbody.appendChild(tr);
            }
            let authorDiv = document.createElement("div");
            authorDiv.style.width = "498px";
            authorDiv.style.borderTop = "1px solid black";
            authorDiv.style.borderRight = "1px solid black";
            authorDiv.style.borderLeft = "1px solid black";
            authorDiv.innerHTML = betSet.Author;
            div.appendChild(authorDiv);
            div.appendChild(table);
            betForm.parentElement.appendChild(div);
        }
    }

    public FillOutBets(bets: IBet[]) {
        const betForm = this.FindBetForm();
        const trs = betForm.getElementsByTagName("tr");

        for (let i = 0; i < bets.length; i++) {
            const arena = arenas[i];
            const matchedArena = bets.find(b => b.Arena.Id === arena.Id);
            if (matchedArena === undefined) {
                throw new Error("Could not find a matching arena, something went wrong!");
            }

            //find input that matches the arena name, then get the dropdown
            let select = null;
            let input = null;
            for (let tr of trs) {
                if (tr.textContent.includes(matchedArena.Arena.Name)) {
                    const selects = tr.getElementsByTagName("select");
                    const inputs = tr.getElementsByTagName("input");
                    if (selects.length !== 1) throw new Error(`${selects.length} select elements found! There should only be one!`);
                    if (inputs.length !== 1) throw new Error(`${inputs.length} input elements found! There should only be one!`);
                    select = selects[0];
                    input = inputs[0];
                }
            }

            select.value = matchedArena.Pirate !== undefined ? matchedArena.Pirate.Id.toString() : "";
            input.checked = matchedArena.Pirate !== undefined ? true : false;
        }
    }

    //searches the provided subreddit url for food club bets tables
    //and returns an array of food club bets
    public async ParseFoodClubBetsRedditThread(url: string): Promise<BetSet[]> {
        const arenaShortNames = arenas.map(x => x.ShortName.toLowerCase());
        let betSets: BetSet[] = [];
        await fetch(url + ".json")
        .then(x => x.json())
        .then((res: SubredditPostResponse[]) => {
            if (res.length !== 2) {
                alert(`${res.length} items from array returned. There should be 2`);
                return [];
            }

            //set title on food club bets page
            let betForm = this.FindBetForm();
            let p = document.createElement("p");
            p.style.fontWeight = "bold";
            p.style.fontSize = "16px";
            p.innerHTML = res[0].data.children[0].data.title;
            betForm.parentElement.appendChild(p);

            for (let c of res[1].data.children) {
                const author = c.data.author;
                const score = c.data.score;
                const bodyHtml = c.data.body_html;
                //initialize a reusable parser
                const parser = new DOMParser();
                //the bodyHtml from reddit needs to be html escaped first
                const escapedHtml = parser.parseFromString(bodyHtml, "text/html");
                //now we need to take the escaped html (xml) string and form a document
                const doc = parser.parseFromString(escapedHtml.documentElement.textContent, "text/xml");
                const tables = doc.getElementsByTagName("table");
                for (let table of tables) {
                    if (!arenaShortNames.every(arena => table.textContent.toLowerCase().includes(arena))) continue;
                    const trs = table.getElementsByTagName("tr");
                    let arenaNamesAndPositions: IArenaPosition[] = [];
                    let betSet: BetSet = { Author: null, Rows: [] };
                    betSet.Author = author;
                    for (let a = 0; a < trs.length; a++) {
                        const tr = trs[a].children;
                        //the first tr should always contain the arena names and positions, if not, skip this table
                        if (a === 0) {
                            for (let b = 0; b < tr.length; b++) {
                                const td = tr[b];
                                const arenaName = arenaShortNames.find(x => td.textContent.toLowerCase().trim() === x);
                                if (arenaName === undefined) continue;
                                arenaNamesAndPositions.push({ ArenaPosition: b, ArenaShortName: arenaName });
                            }
                            if (arenaNamesAndPositions.length !== 5) break;
                        }
                        else {
                            let bets: IBet[] = [];
                            for (let b = 1; b < tr.length - 1; b++) {
                                var pirateName = tr[b].textContent === "" ? null : tr[b].textContent;
                                var pirate = pirates.find(x => x.ShortName.toLowerCase() === pirateName?.toLocaleLowerCase().trim());
                                var arenaName = arenaNamesAndPositions.find(x => x.ArenaPosition === b).ArenaShortName;
                                var arena = arenas.find(x => x.ShortName.toLowerCase() === arenaName);
                                bets.push({
                                    Arena: arena,
                                    Pirate: pirate,
                                });
                            }
                            if (bets.length !== 5) break;
                            betSet.Rows.push({ BetNumber: a, Bets: bets });
                        }
                    }
                    if (betSet.Rows.length >= 10) betSets.push(betSet);
                }
            }
        });
        return betSets;
    }

    public async FetchFoodClubBetsRedditThread(): Promise<string> {
        let mostRecentFoodClubBetsUrl: string = null;
        const baseSubredditSearchUrl = "https://old.reddit.com/r/neopets.json";
        let subredditSearchUrl = baseSubredditSearchUrl;
        let subredditSearchAttempts = 0;
        while (++subredditSearchAttempts <= 5 && mostRecentFoodClubBetsUrl === null) {
            await fetch(subredditSearchUrl)
            .then(res => res.json())
            .then((res: SubredditResponse) => {
                subredditSearchUrl = baseSubredditSearchUrl + `?after=${res.data.after}`
                for (let c of res.data.children) {
                    const title = c.data.title.toLowerCase();
                    const linkFlareText = c.data.link_flair_text;
                    const url = c.data.url;
                    
                    if (linkFlareText.trim() !== "Food Club") continue;

                    //initialize date object
                    const dateTimeFormatOptions: Intl.DateTimeFormatOptions = {
                        year: 'numeric', month: 'long', day: '2-digit'
                    }
                    const date = new Date();
                    const currentMonth = date.getMonth(); //current month. this is 0 based. 0 = January
                    const currentDay = date.getDate();
                    const currentYear = date.getFullYear();
                    const currentMonthName = new Date(currentYear, currentMonth, currentDay)
                        .toLocaleString(undefined, { month: "long" });
                    const currentDateFormatted = new Date(currentYear, currentMonth, currentDay)
                        .toLocaleString(undefined, dateTimeFormatOptions)
                        .toLowerCase();
                    const nextDateFormatted = new Date(currentYear, currentMonth, currentDay + 1)
                        .toLocaleString(undefined, dateTimeFormatOptions)
                        .toLowerCase();
                    const valuesToLookFor = [ currentDay, currentYear, currentMonthName ];
                    
                    const formattedDatesToLookFor = [ currentDateFormatted, nextDateFormatted ];
                    console.log(formattedDatesToLookFor);
                    if (!formattedDatesToLookFor.find(x => title.includes(x))) continue;

                    mostRecentFoodClubBetsUrl = url;
                    break;
                }
            });
        }
        return mostRecentFoodClubBetsUrl;
    }
}

//initialize class
//this will run on each page change
const app = new App();
