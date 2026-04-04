import { expect, test, vi } from "vitest" ;

vi.mock("electron", () => {
    return {
        app: {
            getVersion: () => '0.0.0',
        },
        dialog: {
            showErrorBox: vi.fn(),
            showMessageBox: () => Promise.resolve(undefined),
        },
        Menu: class {
        },
        MenuItem: class {
        },
    } ;
}) ;

import { SCCoach } from "../main/apps/sccoach" ;

test("syncCoach blocks before connect when coach-owned sync config is invalid", () => {
    const coach = Object.create(SCCoach.prototype) as any ;
    coach.project_ = {
        graph_mgr_: {
            coachConfigs: [
                {
                    name: "Bad Graph",
                    xlabel: "X",
                    yleft: "Y",
                    yright: "",
                    title: "Title",
                    type: "line",
                    teams: [111],
                    leftitems: [],
                    rightitems: [],
                    owner: "central",
                },
            ],
        },
        picklist_mgr_: {
            coachesPicklists: [],
        },
    } ;
    coach.image_mgr_ = {
        setExtraImageDirs: vi.fn(),
    } ;
    coach.sync_client_ = {
        connect: vi.fn(() => Promise.resolve()),
    } ;
    coach.logger_ = {
        error: vi.fn(),
    } ;

    coach["syncCoach"]() ;

    expect(coach.sync_client_.connect).not.toHaveBeenCalled() ;
    expect(coach.logger_.error).toHaveBeenCalled() ;
}) ;
