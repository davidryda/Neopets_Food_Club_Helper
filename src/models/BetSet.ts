import IBet from "./Bet";

export default interface BetSet {
    Author: string;
    Rows: IRow[];
}

interface IRow {
    BetNumber: number;
    Bets: IBet[];
}